from typing import Literal, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from layers.layer_gaia import GaiaLayer

class Item:

    def __init__(self, x: int, y: int, type: str, name: str) -> None:
        self.x: int = x
        self.y: int = y
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
        self._gaia_layer: Optional['GaiaLayer'] = None

    def get_gaia(self, t: float) -> Layer:
        """
        t: seconds since beginning of game
        """
        if self._gaia_layer is None:
            from layers.layer_gaia import GaiaLayer
            self._gaia_layer = GaiaLayer()
            self._gaia_layer.prepare(self.raw.get('gaia', []))

        return self._gaia_layer

    def get_game_state_json(self, t: Optional[float]) -> str:
        """
        Gets game state at timepoint t (seconds since start)
        """
        return "{}"

    @classmethod
    def create_game_from_record(cls, id: str, parsed_data): 
        return Game(id=id, parsed_game=parsed_data)

