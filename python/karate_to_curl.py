import re
import sys
import json

def karate_to_curl(karate_log):
    """
    Converts a Karate request log into a curl command.

    Args:
        karate_log: The Karate request log as a string.

    Returns:
        The curl command as a string.
    """
    lines = karate_log.strip().split('\n')
    method = None
    url = None
    headers = {}
    body = None
    in_request = False  # Flag to track if we are in request headers

    for line in lines:
        line = line.strip()

        # Match lines starting with a number followed by '> '
        match = re.match(r'^(\d+)\s*>\s*(.*)', line)
        if match:
            in_request = True
            line = match.group(2).strip()

            if not method and ' ' in line:
                parts = line.split(" ", 1)
                method = parts[0]
                url = parts[1]
            elif ':' in line and not line.startswith("{"):
                key, value = line.split(':', 1)
                headers[key.strip()] = value.strip()
        elif in_request and line.startswith('{'):
            body = line
            in_request = False  # Assume body is at the end of the request
        elif in_request and line == "":
            # Empty line could indicate end of headers 
            in_request = False
        

    if not method:
        raise ValueError("Invalid Karate log: HTTP method not found.")
    if not url:
        raise ValueError("Invalid Karate log: URL not found.")

    curl_command = f"curl -X {method}"

    for key, value in headers.items():
        if key.lower() == 'content-length':
            continue # Skip content length
        curl_command += f' -H "{key}: {value}"'

    if body:
        curl_command += f" -d '{body}'"

    curl_command += f" \"{url}\""  # Quote the URL

    return curl_command

if __name__ == "__main__":
    # Read input from stdin
    karate_log = sys.stdin.read()

    try:
        # Convert to curl command
        result = karate_to_curl(karate_log)

        # Output as JSON
        output = {
            "status": "success",
            "curl": result
        }
        print(json.dumps(output))
        sys.exit(0)
    except Exception as e:
        # Handle errors
        error_output = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)