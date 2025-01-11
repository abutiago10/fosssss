from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/api/rungrid', methods=['POST'])
def run_grid():
    try:
        # Define the path to the gridding.py script
        script_path = os.path.join(os.path.dirname(__file__), 'python', 'gridding.py')
        
        # Run the gridding.py script
        result = subprocess.run(['python', script_path], capture_output=True, text=True)
        
        # Check if the script ran successfully
        if result.returncode == 0:
            print('Grid script executed successfully')
            return jsonify({"message": "Grid script executed successfully", "output": result.stdout}), 200
        else:
            return jsonify({"message": "Grid script execution failed", "error": result.stderr}), 500
    except Exception as e:
        return jsonify({"message": "An error occurred", "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)