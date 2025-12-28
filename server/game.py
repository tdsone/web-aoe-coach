from typing import Literal

class Item: 

    def __init__(self) -> None:
        pass

class Layer:

    def __init__(self, type: Literal['gaia']) -> None:
        self.type = type
        self.items :list[Item] = []

    def make_items() -> None: 
        raise NotImplementedError
        

class Game:

    def __init__(self, parsed_game) -> None:
        self.raw = parsed_game
        pass

    def get_gaia(self, t: float) -> Layer:
        """
        t: seconds since beginning of game
        """
        return Layer('gaia')

    @classmethod
    def create_game_from_record(cls, parsed_data): 
        return Game(parsed_game=parsed_data)

