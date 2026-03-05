import json

def clean_spaces(input_filename, output_filename):
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        cleaned_data = {}
        total_removed = 0
        
        for category, entries in data.items():
            # Keep only entries where the word has NO spaces
            filtered_entries = [
                e for e in entries 
                if ' ' not in e.get('word', '').strip()
            ]
            
            removed_count = len(entries) - len(filtered_entries)
            total_removed += removed_count
            cleaned_data[category] = filtered_entries
            
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, ensure_ascii=False, indent=4)
            
        print(f"Cleanup Complete.")
        print(f"Removed {total_removed} words containing spaces.")
        print(f"Cleaned file saved as: {output_filename}")
        
    except FileNotFoundError:
        print("Error: marathi_wordbank.json not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    clean_spaces('marathi_wordbank_cleaned.json', 'marathi_wordbank.json')