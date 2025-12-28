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

    def __init__(self) -> None:
        pass

    def get_gaia(self, t: float) -> Layer:
        return Layer('gaia')

