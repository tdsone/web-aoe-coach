
import os
import sys

# Add server to path
sys.path.append(os.path.join(os.getcwd(), "server"))

from layers.layer_buildings import BuildingLayer

def test_time_parsing():
    layer = BuildingLayer()
    
    # Test cases for time parsing
    test_times = [
        ("0:00:04.649000", 4.649),
        ("0:01:30.000000", 90.0),
        ("1:00:00.000000", 3600.0),
        ("0:00:00.000000", 0.0),
        (None, 0.0),
        ("", 0.0)
    ]
    
    print("Testing time parsing:")
    for ts_str, expected in test_times:
        actual = layer._parse_timestamp(ts_str)
        print(f"  '{ts_str}' -> {actual}s (Expected: {expected}s)")
        assert abs(actual - expected) < 1e-6

def test_prepare_output():
    layer = BuildingLayer()
    
    raw_data = {
        "players": [
            {
                "number": 1,
                "objects": [
                    {"name": "Town Center", "position": {"x": 10, "y": 20}},
                    {"name": "Town Center", "position": {"x": 12, "y": 22}}
                ]
            }
        ],
        "actions": [
            {
                "type": "build",
                "timestamp": "0:00:10.000000",
                "player": 1,
                "position": {"x": 30, "y": 40},
                "payload": {"building": "House"}
            },
            {
                "type": "build",
                "timestamp": "0:01:00.000000",
                "player": 1,
                "position": {"x": 50, "y": 60},
                "payload": {"building": "Barracks"}
            }
        ]
    }
    
    print("\nTesting prepare() with console output:")
    # t=15 should include TC and House, but not Barracks
    layer.prepare(raw_data, t=15.0)
    
    assert len(layer.items) == 2
    assert layer.items[0].name == "Town Center"
    assert layer.items[1].name == "House"

if __name__ == "__main__":
    try:
        test_time_parsing()
        test_prepare_output()
        print("\nAll tests passed!")
    except Exception as e:
        print(f"\nTest failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
