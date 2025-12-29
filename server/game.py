from typing import Literal, List, Optional, TYPE_CHECKING, Dict, Any
from statistics import parse_aoe_timestamp_sec

if TYPE_CHECKING:
    from layers.layer_gaia import GaiaLayer


def parse_duration(duration_str: str) -> float:
    """
    Parse duration string in format 'h:mm:ss.ssssss' to seconds.
    e.g. '0:29:00.555000' -> 1740.555
    """
    parts = duration_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])
    return hours * 3600 + minutes * 60 + seconds

class Item:

    def __init__(self, x: float, y: float, type: str, name: str) -> None:
        self.x: float = x
        self.y: float = y
        self.type: str = type
        self.name: str = name


class Layer:

    def __init__(self, type: Literal['gaia']) -> None:
        self.type = type
        self.items: List[Item] = []

    def make_items(self) -> None:
        raise NotImplementedError

    def to_json(self) -> str:
        """
        Takes a layer object and converts it to json
        """
        raise NotImplementedError



class Game:
    def __init__(self, id, parsed_game) -> None:
        self.id = id # globaly unique uuid str
        self.raw = parsed_game
        self.duration = parse_duration(parsed_game['duration'])  # seconds since start
        self._gaia_layer: Optional[Layer] = None
        self._buildings_layer: Optional[Layer] = None
        # Extract map size from parsed data, default to 120
        self.map_size = parsed_game.get('map', {}).get('dimension', 120)
        self.statistics: List[Dict[str, Any]] = []

    def compute_statistics(self):
        from statistics import prepare_aoe_minimal, compute_all_timeslices
        prep = prepare_aoe_minimal(self.raw)
        self.statistics = compute_all_timeslices(prep, window_size=15)

    def get_gaia(self, t: float) -> Layer:
        """
        t: seconds since beginning of game
        """
        if self._gaia_layer is None:
            from layers.layer_gaia import GaiaLayer
            self._gaia_layer = GaiaLayer()
            self._gaia_layer.prepare(self.raw.get('gaia', []))

        return self._gaia_layer

    def get_buildings(self, t: float) -> Layer:
        """
        t: seconds since beginning of game
        """
        from layers.layer_buildings import BuildingLayer
        layer = BuildingLayer()
        layer.prepare(self.raw, t)
        return layer

    def get_game_state_json(self, t: Optional[float]) -> str:
        """
        Gets game state at timepoint t (seconds since start)
        """
        return "{}"

    def get_metadata(self) -> Dict[str, Any]:
        aoe_json = self.raw
        
        # Players
        players_raw = aoe_json.get('players', [])
        players_list = []
        for p in players_raw:
            team_id = p.get('team_id')
            if team_id is None:
                team_id = p.get('team')
            
            p_data = {
                "number": p.get('number'),
                "name": p.get('name'),
                "profile_id": p.get('profile_id'),
                "profile_url": f"https://www.aoe2insights.com/user/{p.get('profile_id')}/" if p.get('profile_id') is not None else None,
                "team_id": team_id,
                "winner": p.get('winner'),
                "eapm": p.get('eapm'),
                "civilization": p.get('civilization'),
                "civilization_id": p.get('civilization_id'),
                "color": p.get('color'),
                "color_id": p.get('color_id'),
                "rate_snapshot": p.get('rate_snapshot')
            }
            players_list.append(p_data)

        # Uptimes
        uptimes = aoe_json.get('uptimes', [])
        if uptimes:
            # Map player number to their uptimes
            player_uptimes = {}
            for u in uptimes:
                player_num = u.get('player')
                age = u.get('age')
                ts = u.get('timestamp')
                if player_num is None or age is None:
                    continue
                
                t_sec = parse_aoe_timestamp_sec(ts)
                if t_sec is None or (isinstance(t_sec, float) and (t_sec != t_sec or t_sec == float('inf'))): # check for NaN or inf
                     continue

                if player_num not in player_uptimes:
                    player_uptimes[player_num] = {}
                
                age_key = f"age_{age}_sec"
                # Keep earliest timestamp per age
                if age_key not in player_uptimes[player_num] or t_sec < player_uptimes[player_num][age_key]:
                    player_uptimes[player_num][age_key] = t_sec
            
            # Merge back to players
            for p in players_list:
                p_num = p.get('number')
                if p_num in player_uptimes:
                    p.update(player_uptimes[p_num])

        # Chat
        chat = aoe_json.get('chat', [])
        n_chat_messages = len(chat)

        # Meta
        meta = {
            "guid": aoe_json.get('guid'),
            "timestamp": aoe_json.get('timestamp'),
            "duration_sec": parse_aoe_timestamp_sec(aoe_json.get('duration')),
            "completed": aoe_json.get('completed'),
            "type": aoe_json.get('type'),
            "diplomacy_type": aoe_json.get('diplomacy_type'),
            "teams": aoe_json.get('teams', []),
            "rated": aoe_json.get('rated'),
            "lobby": aoe_json.get('lobby'),
            "private": aoe_json.get('private'),
            "speed": aoe_json.get('speed'),
            "lock_speed": aoe_json.get('lock_speed'),
            "population": aoe_json.get('population'),
            "starting_age": aoe_json.get('starting_age'),
            "map_reveal": aoe_json.get('map_reveal'),
            "difficulty": aoe_json.get('difficulty'),
            "cheats": aoe_json.get('cheats'),
            "lock_teams": aoe_json.get('lock_teams'),
            "team_together": aoe_json.get('team_together'),
            "multiqueue": aoe_json.get('multiqueue'),
            "all_technologies": aoe_json.get('all_technologies'),
            "hidden_civs": aoe_json.get('hidden_civs'),
            "allow_specs": aoe_json.get('allow_specs'),
            "hash": aoe_json.get('hash'),
            "n_players": len(players_list),
            "winners": [p.get('number') for p in players_list if p.get('winner') is True],
            "n_chat_messages": n_chat_messages
        }

        return {
            "meta": meta,
            "players": players_list
        }

    @classmethod
    def create_game_from_record(cls, id: str, parsed_data):
        return Game(id=id, parsed_game=parsed_data)

