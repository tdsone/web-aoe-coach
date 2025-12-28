from typing import List, Dict, Any
import json
import sys
import os

# Add the parent directory to sys.path to allow importing from 'game'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from game import Item, Layer
except ImportError:
    # Fallback for when it's imported from the server directory
    from ..game import Item, Layer

class GaiaItem(Item):
    def __init__(self, x: float, y: float, name: str) -> None:
        super().__init__(x=int(x), y=int(y), type='gaia', name=name)
        self.x_float: float = x  # Store original float for precision if needed
        self.y_float: float = y

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": self.x_float,
            "y": self.y_float,
            "name": self.name
        }

class GaiaLayer(Layer):
    def __init__(self, config_path: str = "server/config/gaia.json") -> None:
        super().__init__(type='gaia')
        self.config = self._load_config(config_path)
        self.items: List[GaiaItem] = []

    def _load_config(self, path: str) -> Dict[str, Any]:
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "defaults": {"show": True},
                "items": []
            }

    def _get_item_config(self, name: str) -> Dict[str, Any]:
        defaults = self.config.get("defaults", {"show": True})
        for item in self.config.get("items", []):
            if item.get("name") == name:
                return {
                    "show": item.get("show", defaults.get("show"))
                }
        return defaults

    def prepare(self, gaia_data: List[Dict[str, Any]]) -> None:
        self.items = []
        for d in gaia_data:
            name = d.get("name") or "unknown"
            cfg = self._get_item_config(name)
            
            if not cfg.get("show", True):
                continue
            
            pos = d.get("position", {})
            item = GaiaItem(
                x=float(pos.get("x", 0)),
                y=float(pos.get("y", 0)),
                name=name
            )
            self.items.append(item)
