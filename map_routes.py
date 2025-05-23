import json
import os

def parse_mapping_file():
    # Path to the mapping file - you'll need to adjust this to your actual file path
    mapping_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mapping.txt')
    output_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mapping.json')
    
    mapping_data = []
    
    try:
        # Read the mapping file
        with open(mapping_file_path, 'r', encoding='utf-8') as file:
            for line in file:
                line = line.strip()
                if line:  # Skip empty lines
                    # Split by the delimiter '/'
                    parts = [part.strip() for part in line.split('/')]
                    
                    if len(parts) >= 3:
                        sector = parts[0]
                        name = parts[1]
                        block_number = parts[2]
                        
                        # Create a structured object
                        mapping_entry = {
                            "area": sector,
                            "name": name,
                            "blockNumber": block_number
                        }
                        
                        mapping_data.append(mapping_entry)
                    else:
                        print(f"Warning: Line '{line}' does not have enough parts, skipping.")
        
        # Save the structured data to a JSON file
        with open(output_file_path, 'w', encoding='utf-8') as output_file:
            json.dump(mapping_data, output_file, indent=2, ensure_ascii=False)
            
        print(f"Mapping data processed successfully.")
        print(f"Total entries: {len(mapping_data)}")
        print(f"Output saved to: {output_file_path}")
        
        return mapping_data
            
    except FileNotFoundError:
        print(f"Error: Mapping file not found at {mapping_file_path}")
        return []
    except Exception as e:
        print(f"Error processing mapping file: {str(e)}")
        return []

if __name__ == "__main__":
    parse_mapping_file()