import json
import os

def fill_routes_with_block_numbers():
    # Paths to the input and output files
    routes_file_path = os.path.join('src', 'routes-data', 'routes.json')
    mapping_file_path = os.path.join('src', 'routes-data', 'mapping.json')
    output_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'filled_routes.json')
    
    try:
        # Load routes data
        with open(routes_file_path, 'r', encoding='utf-8') as file:
            routes_data = json.load(file)
        
        # Load mapping data
        with open(mapping_file_path, 'r', encoding='utf-8') as file:
            mapping_data = json.load(file)
        
        # Create mapping lookup dictionary for faster access
        # Key is a tuple of (area, name) where area matches area and name matches block
        mapping_lookup = {(item.get('area', ''), item.get('name', '')): item.get('blockNumber', '') 
                          for item in mapping_data}
        
        # Process each route and add blockNumber
        filled_routes = []
        match_count = 0
        missing_count = 0
        filtered_count = 0
        
        for route in routes_data:
            # Skip routes with empty difficulty or containing IFAS or {US}
            difficulty = route.get('difficulty', '')
            if (not difficulty or 
                difficulty.strip() == '' or 
                'IFAS' in difficulty or 
                '{US}' in difficulty):
                filtered_count += 1
                continue
                
            # Create a copy of the route to modify
            new_route = route.copy()
            
            # Check if there's a match in the mapping data
            area = route.get('area', '')
            block = route.get('block', '')
            
            if (area, block) in mapping_lookup:
                # Match found, use blockNumber from mapping
                new_route['blockNumber'] = mapping_lookup[(area, block)]
                match_count += 1
            else:
                # No match, use block as blockNumber
                new_route['blockNumber'] = block
                missing_count += 1
            
            filled_routes.append(new_route)
        
        # Save the processed data to a new JSON file
        with open(output_file_path, 'w', encoding='utf-8') as output_file:
            json.dump(filled_routes, output_file, indent=2, ensure_ascii=False)
            
        print(f"Routes processing completed successfully.")
        print(f"Total routes: {len(filled_routes)}")
        print(f"Routes with mapping match: {match_count}")
        print(f"Routes without mapping match: {missing_count}")
        print(f"Routes filtered out due to empty/invalid difficulty: {filtered_count}")
        print(f"Output saved to: {output_file_path}")
        
        return filled_routes
            
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
        return []
    except Exception as e:
        print(f"Error processing files: {str(e)}")
        return []


if __name__ == "__main__":
    fill_routes_with_block_numbers()
