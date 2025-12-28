from typing import Literal, Optional

class Item: 

    def __init__(self) -> None:
        pass

class Layer:

    def __init__(self, type: Literal['gaia']) -> None:
        self.type = type
        self.items :list[Item] = []

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
        pass

    def get_gaia(self, t: float) -> Layer:
        """
        t: seconds since beginning of game
        """
        return Layer('gaia')

    def get_game_state_json(self, t: Optional[float]) -> str:
        """
        Gets game state at timepoint t (seconds since start)
        """
        return "{}"

    @classmethod
    def create_game_from_record(cls, id: str, parsed_data): 
        return Game(id=id, parsed_game=parsed_data)

