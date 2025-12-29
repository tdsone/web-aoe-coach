import math
from typing import List, Dict, Any, Optional
from collections import defaultdict

def parse_aoe_timestamp_sec(ts: Any) -> float:
    if ts is None:
        return float('nan')
    s = str(ts)
    if not s:
        return float('nan')
    
    # Check if it's already a number
    try:
        return float(s)
    except ValueError:
        pass
    
    parts = s.split(':')
    if len(parts) != 3:
        return float('nan')
    try:
        h = float(parts[0])
        m = float(parts[1])
        sec = float(parts[2])
        return h * 3600 + m * 60 + sec
    except ValueError:
        return float('nan')

def get_any(obj: Any, paths: List[List[str]]) -> Any:
    for path in paths:
        cur = obj
        found = True
        for p in path:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            elif isinstance(cur, list) and isinstance(p, int) and p < len(cur):
                cur = cur[p]
            else:
                found = False
                break
        if found:
            return cur
        
        # Also try dotted/underscore keys if single level
        if len(path) >= 2 and isinstance(obj, dict):
            key1 = ".".join(path)
            if key1 in obj: return obj[key1]
            key2 = "_".join(path)
            if key2 in obj: return obj[key2]
            
    return None

def prepare_aoe_minimal(aoe: Dict[str, Any], resolution_sec: int = 1) -> Dict[str, Any]:
    players_raw = aoe.get('players', [])
    
    # Process players
    dt_players = []
    for p in players_raw:
        pid = get_any(p, [['number'], ['player_id'], ['player']])
        if pid is None: continue
        dt_players.append({
            'player_id': int(pid),
            'player_name': get_any(p, [['name']]) or "",
            'eapm': int(get_any(p, [['eapm']]) or 0)
        })
    
    player_ids = sorted([p['player_id'] for p in dt_players])
    players_lookup = {p['player_id']: p for p in dt_players}

    # Starting objects
    start_units = []
    start_buildings = []
    scout_ids_map = defaultdict(list)
    
    for p in players_raw:
        pid = get_any(p, [['number'], ['player_id'], ['player']])
        if pid is None: continue
        pid = int(pid)
        objs = p.get('objects', [])
        for o in objs:
            name = get_any(o, [['name']]) or ""
            class_id = get_any(o, [['class_id'], ['classId']])
            instance_id = get_any(o, [['instance_id'], ['instanceId']])
            
            if class_id == 70 and instance_id is not None:
                start_units.append({
                    'player_id': pid,
                    'unit_id': int(instance_id),
                    'unit_name': name
                })
                if name == "Scout Cavalry":
                    scout_ids_map[pid].append(int(instance_id))
            elif class_id == 80:
                start_buildings.append({
                    'player_id': pid,
                    'building': name if name else "UNKNOWN_BUILDING"
                })

    # Actions
    actions_raw = aoe.get('actions', [])
    dt_actions = []
    for a in actions_raw:
        tp = get_any(a, [['type']])
        if not tp: continue
        
        ts = get_any(a, [['timestamp']])
        t_sec = parse_aoe_timestamp_sec(ts)
        if math.isnan(t_sec): t_sec = 0.0
        
        pid = get_any(a, [['player'], ['player_id']])
        if pid is None: continue
        pid = int(pid)
        
        pos_x = get_any(a, [['position', 'x'], ['position.x'], ['x']])
        pos_y = get_any(a, [['position', 'y'], ['position.y'], ['y']])
        
        building = get_any(a, [['payload', 'building'], ['payload.building'], ['building']])
        technology = get_any(a, [['payload', 'technology'], ['payload.technology'], ['technology']])
        
        obj_ids = get_any(a, [['payload', 'object_ids'], ['payload.object_ids'], ['object_ids']])
        obj_vec = []
        if obj_ids:
            if isinstance(obj_ids, list): obj_vec = [int(i) for i in obj_ids]
            else: obj_vec = [int(obj_ids)]

        dt_actions.append({
            'player_id': pid,
            't_sec': t_sec,
            'sec': int(math.floor(t_sec / resolution_sec) * resolution_sec),
            'type': str(tp),
            'x': float(pos_x) if pos_x is not None else None,
            'y': float(pos_y) if pos_y is not None else None,
            'building': str(building) if building else None,
            'technology': str(technology) if technology else None,
            'object_ids': obj_vec
        })
    
    dt_actions.sort(key=lambda x: (x['player_id'], x['t_sec']))
    
    game_end = 0.0
    if dt_actions:
        game_end = max(game_end, max(a['t_sec'] for a in dt_actions))

    # Moves and unit first seen
    dt_moves = []
    unit_first_seen = defaultdict(lambda: 1e18) # (player_id, unit_id) -> t_first
    
    # Initialize unit_first_seen with starting units
    for su in start_units:
        unit_first_seen[(su['player_id'], su['unit_id'])] = 0.0

    last_pos = {} # (player_id, unit_id) -> (x, y)
    
    for a in dt_actions:
        # Track first seen for all units mentioned in actions
        for uid in a['object_ids']:
            key = (a['player_id'], uid)
            if a['t_sec'] < unit_first_seen[key]:
                unit_first_seen[key] = a['t_sec']
        
        if a['type'] == "MOVE":
            for uid in a['object_ids']:
                key = (a['player_id'], uid)
                if a['x'] is not None and a['y'] is not None:
                    step_len = 0.0
                    if key in last_pos:
                        lx, ly = last_pos[key]
                        step_len = math.sqrt((a['x'] - lx)**2 + (a['y'] - ly)**2)
                    
                    dt_moves.append({
                        'player_id': a['player_id'],
                        't_sec': a['t_sec'],
                        'sec': a['sec'],
                        'unit_id': uid,
                        'step_len': step_len
                    })
                    last_pos[key] = (a['x'], a['y'])

    # Uptimes (Ages)
    uptimes_raw = aoe.get('uptimes', [])
    dt_uptimes = []
    for u in uptimes_raw:
        pid = get_any(u, [['player'], ['player_id']])
        if pid is None: continue
        ts = get_any(u, [['timestamp']])
        t_sec = parse_aoe_timestamp_sec(ts)
        if math.isnan(t_sec): t_sec = 0.0
        dt_uptimes.append({
            'player_id': int(pid),
            't_sec': t_sec,
            'age': get_any(u, [['age']])
        })
    dt_uptimes.sort(key=lambda x: (x['player_id'], x['t_sec']))
    if dt_uptimes:
        game_end = max(game_end, max(u['t_sec'] for u in dt_uptimes))

    # Timeseries (Resources)
    dt_ts = []
    for p in players_raw:
        pid = get_any(p, [['number'], ['player_id'], ['player']])
        if pid is None: continue
        pid = int(pid)
        ts_list = get_any(p, [['timeseries']]) or []
        for s in ts_list:
            t_sec = parse_aoe_timestamp_sec(get_any(s, [['timestamp']]))
            if math.isnan(t_sec): t_sec = 0.0
            dt_ts.append({
                'player_id': pid,
                't_sec': t_sec,
                'total_resources': float(get_any(s, [['total_resources'], ['totalResources']]) or 0),
                'total_objects': float(get_any(s, [['total_objects'], ['totalObjects']]) or 0)
            })
    dt_ts.sort(key=lambda x: (x['player_id'], x['t_sec']))
    if dt_ts:
        game_end = max(game_end, max(s['t_sec'] for s in dt_ts))

    # Tech first seen
    tech_first_seen = defaultdict(lambda: 1e18) # (player_id, tech_name) -> t_first
    for a in dt_actions:
        if a['type'] == "RESEARCH" and a['technology']:
            key = (a['player_id'], a['technology'])
            if a['t_sec'] < tech_first_seen[key]:
                tech_first_seen[key] = a['t_sec']

    return {
        'players': dt_players,
        'player_ids': player_ids,
        'players_lookup': players_lookup,
        'start_units': start_units,
        'start_buildings': start_buildings,
        'scout_ids_map': scout_ids_map,
        'actions': dt_actions,
        'moves': dt_moves,
        'uptimes': dt_uptimes,
        'timeseries': dt_ts,
        'unit_first_seen': unit_first_seen,
        'tech_first_seen': tech_first_seen,
        'game_end': game_end,
        'resolution_sec': resolution_sec
    }

def compute_timeslice(prep: Dict[str, Any], t_start: float, t_end: float, player_ids: List[int]) -> List[Dict[str, Any]]:
    res = prep['resolution_sec']
    sec_start = int(math.floor(t_start / res) * res)
    sec_end = int(math.floor(t_end / res) * res)
    
    results = []
    for pid in player_ids:
        player_info = prep['players_lookup'].get(pid, {'player_name': f"Player {pid}", 'eapm': 0})
        
        # Actions in window
        actions_in_window = [a for a in prep['actions'] if a['player_id'] == pid and sec_start <= a['sec'] <= sec_end]
        total_actions = len(actions_in_window)
        actions_by_type = defaultdict(int)
        for a in actions_in_window:
            actions_by_type[a['type']] += 1
            
        # Moves and Scout
        moves_in_window = [m for m in prep['moves'] if m['player_id'] == pid and t_start < m['t_sec'] <= t_end]
        units_moved = sorted(list(set(m['unit_id'] for m in moves_in_window)))
        
        scout_ids = prep['scout_ids_map'].get(pid, [])
        scout_activity = sum(m['step_len'] for m in moves_in_window if m['unit_id'] in scout_ids)
        
        # State at t_end
        total_unit_count = sum(1 for (p, u), t in prep['unit_first_seen'].items() if p == pid and t <= t_end)
        
        # Buildings
        buildings_counts = defaultdict(int)
        for sb in prep['start_buildings']:
            if sb['player_id'] == pid:
                buildings_counts[sb['building']] += 1
        for a in prep['actions']:
            if a['player_id'] == pid and a['type'] == "BUILD" and a['t_sec'] <= t_end:
                bname = a['building'] or "UNKNOWN_BUILDING"
                buildings_counts[bname] += 1
        
        total_building_count = sum(buildings_counts.values())
        all_buildings_existing_str = "; ".join([f"{k}={v}" for k, v in sorted(buildings_counts.items())])
        
        # Age
        current_age = "DARK_AGE"
        for u in prep['uptimes']:
            if u['player_id'] == pid and u['t_sec'] <= t_end:
                current_age = u['age']
        
        # Resources
        resource_count = None
        total_objects_snapshot = None
        for s in prep['timeseries']:
            if s['player_id'] == pid and s['t_sec'] <= t_end:
                resource_count = s['total_resources']
                total_objects_snapshot = s['total_objects']
        
        # Research
        all_research_existing = sorted([tech for (p, tech), t in prep['tech_first_seen'].items() if p == pid and t <= t_end])
        
        # Units list
        all_units_existing = sorted([uid for (p, uid), t in prep['unit_first_seen'].items() if p == pid and t <= t_end])

        res_dict = {
            'player': pid,
            't_start': t_start,
            't_end': t_end,
            'player_name': player_info['player_name'],
            'eapm': player_info['eapm'],
            'actions_in_window': total_actions,
            'actions_by_type': dict(actions_by_type),
            'n_units_moved_in_window': len(units_moved),
            'units_moved_in_window': units_moved,
            'scout_activity_in_window': scout_activity,
            'total_unit_count': total_unit_count,
            'total_building_count': total_building_count,
            'current_age': current_age,
            'resource_count': resource_count,
            'total_objects_snapshot': total_objects_snapshot,
            'all_buildings_existing': all_buildings_existing_str,
            'all_research_existing': all_research_existing,
            'all_units_existing': all_units_existing
        }
        results.append(res_dict)
    return results

def compute_all_timeslices(prep: Dict[str, Any], window_size: int = 15) -> List[Dict[str, Any]]:
    game_end = prep['game_end']
    player_ids = prep['player_ids']
    
    all_results = []
    
    t_start = 0.0
    while t_start <= game_end:
        t_end = t_start + window_size
        slices = compute_timeslice(prep, t_start, t_end, player_ids)
        all_results.extend(slices)
        t_start += window_size
        
    # Flatten/expand actions_by_type
    all_types = set()
    for r in all_results:
        for tp in r['actions_by_type']:
            all_types.add(tp)
    
    for r in all_results:
        for tp in sorted(list(all_types)):
            r[f"actions_in_window_{tp}"] = r['actions_by_type'].get(tp, 0)
        # remove the helper dict
        del r['actions_by_type']
        
    return all_results
