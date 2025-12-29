from typing import Literal, List, Optional, TYPE_CHECKING, Dict, Any

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

    @classmethod
    def create_game_from_record(cls, id: str, parsed_data):
        return Game(id=id, parsed_game=parsed_data)

