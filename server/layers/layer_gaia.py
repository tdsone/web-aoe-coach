from typing import List, Dict, Any
import json
import os
from game import Item, Layer

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
    def __init__(self, config_path: str = None) -> None:
        super().__init__(type='gaia')
        if config_path is None:
            # Get path relative to this file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            config_path = os.path.join(base_dir, "config", "gaia.json")
        self.config = self._load_config(config_path)
        self.items: List[GaiaItem] = []

    def _load_config(self, path: str) -> Dict[str, Any]:
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "defaults": {"show": False},
                "items": []
            }

    def _get_item_config(self, name: str) -> Dict[str, Any]:
        defaults = self.config.get("defaults", {"show": False})
        for item in self.config.get("items", []):
            if item.get("name") == name:
                return {
                    "show": item.get("show", defaults.get("show", False))
                }
        return defaults

    def prepare(self, gaia_data: List[Dict[str, Any]]) -> None:
        self.items = []
        hidden_names = set()
        # Debug: Print all unique names in raw data
        raw_names = {d.get("name") or "unknown" for d in gaia_data}
        print(f"DEBUG: All unique Gaia names in raw data: {', '.join(sorted(raw_names))}")


        for d in gaia_data:
            name = d.get("name") or "unknown"
            cfg = self._get_item_config(name)
            
            # Use False as default for show if not found in cfg
            if not cfg.get("show", False):
                hidden_names.add(name)
                continue
            
            pos = d.get("position", {})
            item = GaiaItem(
                x=float(pos.get("x", 0)),
                y=float(pos.get("y", 0)),
                name=name
            )
            self.items.append(item)

        if hidden_names:
            print(f"Hidden Gaia items: {', '.join(sorted(hidden_names))}")
