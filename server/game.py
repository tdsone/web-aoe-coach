from typing import Literal, List, Optional
import sys
import os

from server.layers.layer_gaia import GaiaLayer

# Add current directory to path to allow importing from layers
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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

    def __init__(self, parsed_game) -> None:
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

    def get_game_state_json(self, t: float) -> str:
        """
        Gets game state at timepoint t (seconds since start)
        """
        return "{}"

    @classmethod
    def create_game_from_record(cls, parsed_data): 
        return Game(parsed_game=parsed_data)

