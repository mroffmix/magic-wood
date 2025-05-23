import json
import os
import re
from collections import Counter

def find_non_digit_block_routes():
    # Path to the routes data file
    file_path = os.path.join('src', 'routes-data', 'routes.json')
    
    try:
        # Load JSON data from file
        with open(file_path, 'r', encoding='utf-8') as file:
            routes_data = json.load(file)
        
        # Filter routes where block doesn't start with a digit
        non_digit_block_routes = [route for route in routes_data 
                                 if route.get('block') and not re.match(r'^\d', route['block'])]
        
        # Count routes by area
        area_counts = Counter(route.get('area', 'Unknown') for route in non_digit_block_routes)
        
        # Print the total count
        print(f"Found {len(non_digit_block_routes)} routes with block names starting with non-digit characters.")
        
        # Print count per area
        print("\nDistribution by area:")
        for area, count in sorted(area_counts.items()):
            print(f"   {area}: {count} routes")
            
        # # Print the detailed results
        # print("\nDetailed route information:")
        # for i, route in enumerate(non_digit_block_routes, 1):
        #     print(f"\n{i}. Route details:")
        #     print(f"   ID: {route.get('id', 'N/A')}")
        #     print(f"   Area: {route.get('area', 'N/A')}")
        #     print(f"   Block: {route.get('block', 'N/A')}")
        #     print(f"   Name: {route.get('name', 'N/A')}")
        #     print(f"   Difficulty: {route.get('difficulty', 'N/A')}")
        
        # Save the filtered routes to a new JSON file
        output_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'routes_fix.json')
        with open(output_file_path, 'w', encoding='utf-8') as output_file:
            json.dump(non_digit_block_routes, output_file, indent=2, ensure_ascii=False)
        
        print(f"\nFiltered routes saved to: {output_file_path}")
        
        return non_digit_block_routes
    
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        return []
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in file: {file_path}")
        return []
    except Exception as e:
        print(f"Error: {str(e)}")
        return []

if __name__ == "__main__":
    find_non_digit_block_routes()

