import requests
import json
from dotenv import load_dotenv
import os

FIGMA_FILE_ID = "OcCwkLCqY0MmlPyQe6uSJ7"
GROUP_NAME = "Crags"
# GROUP_NAME = "EmptyCrags"

# Load environment variables from .env file
load_dotenv()
FIGMA_TOKEN = os.getenv("FIGMA_TOKEN")

headers = {
    "X-Figma-Token": FIGMA_TOKEN
}

# Получаем дерево всего файла
url = f"https://api.figma.com/v1/files/{FIGMA_FILE_ID}"
res = requests.get(url, headers=headers)
file_data = res.json()


def find_group_by_name(node, name):
    if node.get("name") == name and node.get("type") in ["GROUP", "FRAME"]:
        return node
    for child in node.get("children", []):
        result = find_group_by_name(child, name)
        if result:
            return result
    return None

# Сохраняем информацию о векторах и node_id
def extract_svg_metadata(node, results=[], parent_group=None):
    current_group = parent_group
    
    # If this node is a group/frame, update the current parent group
    if node.get("type") in ["GROUP", "FRAME"] and node.get("name") != GROUP_NAME:
        current_group = node.get("name")
    
    for child in node.get("children", []):
        if child["type"] == "VECTOR":
            pos = child.get("absoluteBoundingBox", {})
            results.append({
                "name": child.get("name"),
                "sector": current_group,  # Add sector information
                "x": pos.get("x"),
                "y": pos.get("y"),
                "width": pos.get("width"),
                "height": pos.get("height"),
                "node_id": child["id"]
            })
        if "children" in child:
            extract_svg_metadata(child, results, current_group)
    return results

document = file_data["document"]
group_node = find_group_by_name(document, GROUP_NAME)

if not group_node:
    print(f"Группа '{GROUP_NAME}' не найдена.")
    exit(1)

svg_items = extract_svg_metadata(group_node, [])

# Получаем SVG URL для всех элементов
node_ids = ",".join([item["node_id"] for item in svg_items])
images_url = f"https://api.figma.com/v1/images/{FIGMA_FILE_ID}?ids={node_ids}&format=svg"
images_res = requests.get(images_url, headers=headers)
images_data = images_res.json()["images"]

# Загружаем и извлекаем путь d из SVG
for item in svg_items:
    image_url = images_data.get(item["node_id"])
    print(f"{item['name']} -> {image_url}")
    if not image_url:
        continue
    
    # Add timeout and retry logic for reliable downloads
    max_retries = 3
    retry_count = 0
    success = False
    
    while retry_count < max_retries and not success:
        try:
            # Set a reasonable timeout (10 seconds)
            svg_response = requests.get(image_url, timeout=5)
            svg_response.raise_for_status()  # Raise an exception for HTTP errors
            svg_content = svg_response.text
            success = True
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, 
                requests.exceptions.ReadTimeout) as e:
            retry_count += 1
            wait_time = retry_count * 2  # Exponential backoff
            print(f"Attempt {retry_count}/{max_retries} failed for {item['name']}: {str(e)}")
            print(f"Waiting {wait_time} seconds before retrying...")
            import time
            time.sleep(wait_time)
        except requests.exceptions.RequestException as e:
            print(f"Error downloading SVG for {item['name']}: {str(e)}")
            item["path"] = ""  # Set empty path on error
            break
    
    if success:
        path_start = svg_content.find("d=\"")
        if path_start != -1:
            path_end = svg_content.find("\"", path_start + 3)
            path = svg_content[path_start + 3:path_end]
            item["path"] = path
        else:
            item["path"] = ""
    else:
        print(f"Failed to download SVG for {item['name']} after {max_retries} attempts")
        item["path"] = ""

# Генерация TypeScript-файла
output_lines = [
    "import type { SvgObject } from \"./areas\";",
    "export const crags: SvgObject[] = ["
    ]
for item in svg_items:
    output_lines.append("  {")
    output_lines.append(f"    name: \"{item['name']}\",")
    output_lines.append(f"    sector: \"{item['sector'] or ''}\",")  # Add sector to output
    output_lines.append(f"    path: \"{item['path']}\",")
    output_lines.append(f"    fill: \"\",")
    output_lines.append(f"    x: {round(item['x'], 2)},")
    output_lines.append(f"    y: {round(item['y'], 2)},")
    output_lines.append(f"    width: {round(item['width'], 2)},")
    output_lines.append(f"    height: {round(item['height'], 2)},")
    output_lines.append("  },")
output_lines.append("];")

with open("./src/map-data/crags.ts", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print("✅ crags.ts успешно создан.")
