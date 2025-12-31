import json
import os
from typing import List, Dict, Any, Optional
try:
    from game import Item, Layer
except ImportError:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from game import Item, Layer

class BuildingItem(Item):
    def __init__(self, x: float, y: float, name: str, player: int, timestamp: float, 
                 icon: str = None, icon_size: float = None) -> None:
        super().__init__(x=x, y=y, type='building', name=name)
        self.player = player
        self.timestamp = timestamp
        self.icon = icon
        self.icon_size = icon_size

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": self.x,
            "y": self.y,
            "name": self.name
        }

class BuildingLayer(Layer):
    def __init__(self, config_path: str = None) -> None:
        super().__init__(type='building')
        if config_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            config_path = os.path.join(base_dir, "config", "buildings.json")
        self.config = self._load_config(config_path)
        self.items: List[BuildingItem] = []

    def _load_config(self, path: str) -> Dict[str, Any]:
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "defaults": {"show": True},
                "items": []
            }

    def _get_item_config(self, building_name: str) -> Dict[str, Any]:
        defaults = self.config.get("defaults", {})
        for item in self.config.get("items", []):
            if item.get("building") == building_name:
                # Merge with defaults
                cfg = defaults.copy()
                cfg.update(item)
                return cfg
        return defaults

    def _parse_timestamp(self, ts_str: str) -> float:
        if not ts_str:
            return 0.0
        try:
            parts = ts_str.split(':')
            if len(parts) == 3:
                h = float(parts[0])
                m = float(parts[1])
                s = float(parts[2])
                return h * 3600 + m * 60 + s
        except (ValueError, IndexError):
            pass
        return 0.0

    def prepare(self, raw_data: Dict[str, Any], t: float) -> None:
        """
        raw_data: the whole parsed_game dict
        t: current time in seconds
        """
        self.items = []
        detected_buildings = [] # For debugging
        
        # 1. Starting Town Centers from players' objects
        players = raw_data.get('players', [])
        for i, p in enumerate(players):
            if type(p) != dict:
                continue
            print(f"Player {i}")
            player_num = p.get('number')
            objs = p.get('objects', [])
            tcs = [o for o in objs if o.get('name') == "Town Center"]
            
            if not tcs:
                continue

            # In R code they mean average x, y for starting TCs if multiple sub-objects
            # but let's just take the first for simplicity or average if needed.
            # R code: group_by(player, building) %>% summarise(x = mean(x), y = mean(y))
            avg_x = sum(float(o.get('position', {}).get('x', 0)) for o in tcs) / len(tcs)
            avg_y = sum(float(o.get('position', {}).get('y', 0)) for o in tcs) / len(tcs)
            
            detected_buildings.append(("Town Center", 0.0, "starting"))
            
            cfg = self._get_item_config("Town Center")
            if cfg.get("show", True):
                self.items.append(BuildingItem(
                    x=avg_x,
                    y=avg_y,
                    name="Town Center",
                    player=player_num,
                    timestamp=0.0,
                    icon=cfg.get("icon"),
                    icon_size=cfg.get("icon_size")
                ))

        # 2. Buildings from actions
        actions = raw_data.get('actions', [])
        for a in actions:

            if (a.get("type") or "").upper() != "BUILD":
                continue
            
            ts_str = a.get('timestamp')
            ts = self._parse_timestamp(ts_str)
            
            payload = a.get('payload', {})
            building_name = payload.get('building') or "unknown"
            
            detected_buildings.append((building_name, ts, ts_str))

            if ts > t:
                continue
                
            if not payload.get('building'):
                continue
                
            cfg = self._get_item_config(building_name)
            if not cfg.get("show", True):
                continue
                
            pos = a.get('position', {})
            self.items.append(BuildingItem(
                x=float(pos.get('x', 0)),
                y=float(pos.get('y', 0)),
                name=building_name,
                player=a.get('player'),
                timestamp=ts,
                icon=cfg.get("icon"),
                icon_size=cfg.get("icon_size")
            ))

        if detected_buildings:
            print("\nDetected buildings and build times:")
            for name, ts, raw_ts in sorted(detected_buildings, key=lambda x: x[1]):
                print(f"  - {name}: {ts}s ({raw_ts})")
            print(f"Total detected: {len(detected_buildings)}")
            print(f"Filtered for t={t}: {len(self.items)} items in layer\n")
