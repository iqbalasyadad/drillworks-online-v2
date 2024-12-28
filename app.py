from flask import Flask, request, jsonify, session, render_template
# from flask_session import Session
from pymongo import MongoClient
from bson import ObjectId
from bson.json_util import dumps
import hashlib
from flask_cors import CORS  # Import CORS
from flask_talisman import Talisman

app = Flask(__name__)
app.secret_key = 'qwer'
# app.config['SESSION_COOKIE_SAMESITE'] = 'None'
# app.config['SESSION_COOKIE_SECURE'] = False  # Set to True if using HTTPS

Talisman(app, content_security_policy=None)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True

CORS(app, supports_credentials=True)


uri = "mongodb+srv://dbUser:zKqxDcondMcXtBYV@cluster0.7vrza.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri)
db = client['app_one']
users_collection = db['users']
projects_collection = db['projects']
wells_collection = db['wells']
wellbores_collection = db['wellbores']
datasets_collection = db['datasets']


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route("/")
def home():
    if 'user_id' in session:
        print("check session, logged in")
        return render_template("dashboard.html")  # Serves the homepage
    else:
        print("check session, not log in")
        print(session)
        return render_template("login.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        # Serve the login page
        return render_template("login.html")

    if request.method == "POST":
        # Handle login logic
        data = request.get_json()  # Get JSON data from the request
        username = data.get('username')
        password = data.get('password')

        print(username, password)

        # Find the user in MongoDB
        user = users_collection.find_one({"username": username})

        if user and user['password'] == hash_password(password):
            session['user_id'] = str(user['_id'])  # Save user ID in session
            print(f"Session saved: {session}")
            
            if 'user_id' in session:
                print("check session, logged in")
            return jsonify({"success": True}), 200  # Login successful
        else:
            return jsonify({"success": False, "message": "Invalid username or password"}), 401


@app.route("/check-session", methods=["GET"])
def check_session():
    if 'user_id' in session:
        print("check session, logged in")
        return jsonify({"logged_in": True}), 200  # User is logged in
    else:
        print("check session, not log in")
        return jsonify({"logged_in": False}), 200  # User is not logged in

@app.route("/logout")
def logout():
    print("logout request")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    session.pop('user_id', None)  # Remove user_id from session
    return jsonify({"success": True, "message": "Logged out successfully"}), 200   

@app.route('/api/projects', methods=['GET'])
def get_projects():
    print("Received request for get projects")  # Add logging for debugging

    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    user_id = ObjectId(session['user_id'])
    projects = projects_collection.find({"user_id": ObjectId(user_id)})
    result = [{"_id": str(project["_id"]), 
               "name": project["name"],
               "analyst": project["analyst"],
               "date_created": project["dateCreated"]
               } 
               for project in projects]
    return jsonify(result)

@app.route('/api/set-active-project', methods=['POST'])
def set_active_project():
    print("receive request for activate project")
    data = request.json
    project_id = data.get('_id')
    project_name = data.get('name')

    if not project_id:
        return jsonify({"message": "Project ID is required"}), 400

    # Save selected project ID to the session
    session['active_project'] = {
        "_id": project_id,
        "name": project_name
    }
    print(session)
    return jsonify({"message": "Project activated: {}".format(project_id)}), 200

@app.route('/api/get-active-project', methods=['GET'])
def get_active_project():
    print("receive request for get active project")
    session_project = session.get('active_project')
    print(session_project)
    if not session_project:
        return jsonify({"message": "No active project"}), 404
    return jsonify({"_id": session_project['_id'], "name": session_project['name']}), 200

# @app.route('/api/get_session_project', methods=['GET'])
# def get_session_project():
#     print("receive request for get session project")

#     session_project = session.get('project')
#     if not session_project:
#         return jsonify({"message": "No project selected"}), 404
#     return jsonify({"id": session_project['id'], "name": session_project['name']}), 200

@app.route('/api/projects', methods=['POST'])
def add_project():
    print("Received request to add project")
    data = request.json

    # Check if the user is authenticated
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    user_id = ObjectId(session['user_id'])

    # Check for duplicate project name for the same user
    name = data.get('name')
    if not name:
        return jsonify({"success": False, "message": "Project name is required"}), 400

    existing_project = projects_collection.find_one({"user_id": user_id, "name": name})
    if existing_project:
        return jsonify({"success": True, "message": "A project with the same name already exists"}), 200

    # Prepare the new project data
    new_project = {
        "_id": ObjectId(),
        "name": name,
        "description": data.get('description', ''),
        "analyst": data.get('analyst', ''),
        "defaultDepthUnit": data.get('default_depth_unit', ''),
        "notes": data.get('notes', ''),
        "dateCreated": data.get('date_created', ''),
        "user_id": [ObjectId(user_id)],
        "wells": []  # Empty wells list initially
    }

    # Insert the project into the database
    try:
        print("Creating project:", name)
        project_id = projects_collection.insert_one(new_project).inserted_id

        # Store project details in the session
        session['project'] = {"id": str(project_id), "name": name}
        print("Project session set:", session['project'])

        # Return a success response
        return jsonify({
            "success": True,
            "message": "Project added successfully",
            "project": {
                "_id": str(project_id),
                "name": name
            }
        })

    except Exception as e:
        print(f"Error while adding project: {e}")
        return jsonify({"success": False, "message": "Failed to add project"}), 500



@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project_with_wells(project_id):
    print("Received request delete project")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    try:
        if not ObjectId.is_valid(project_id):
            return jsonify({"error": "Invalid project ID"}), 400

        project_id_obj = ObjectId(project_id)

        # Parse the checkbox value from the query parameters
        delete_wells = request.args.get('delete_wells', 'false').lower() == 'true'

        # Delete the project itself
        projects_collection.delete_one({"_id": project_id_obj})

        # Remove the project reference from wells
        wells_collection.update_many(
            {"projects": project_id_obj},
            {"$pull": {"projects": project_id_obj}}
        )

        wells_deleted_count = 0

        if delete_wells:
            # Find and delete wells no longer associated with any project
            wells_to_delete = wells_collection.find({"projects": {"$size": 0}})
            well_ids_to_delete = [well["_id"] for well in wells_to_delete]

            if well_ids_to_delete:
                wells_deleted_count = wells_collection.delete_many({"_id": {"$in": well_ids_to_delete}}).deleted_count

        return jsonify({
            "success": True,
            "message": f"Successfully deleted project {project_id}.",
            "wells_deleted": wells_deleted_count if delete_wells else 0
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wells', methods=['POST'])
def add_well():
    print("Received request add well")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    data = request.json
    project_id = data.get('project_id')

    # Check for duplicate project name for the same user
    well_uid = data.get('uid')
    existing_well_uid = wells_collection.find_one({"uid": well_uid})
    if existing_well_uid:
        return jsonify({"success": False, "message": "A well with the same well UID already exists for this user"}), 400
    
    new_well = {
        "_id": ObjectId(),
        "name": data.get('name'),
        "uid": data.get('uid'),
        "description": data.get('description'),
        "commonName": data.get('common_name'),
        "status": data.get('status'),
        "basinName": data.get('basin_name'),
        "dominantGeology": data.get('dominant_geology'),
        "waterVelocity": data.get('water_velocity'),
        "groundElevation": data.get('ground_elevation'),
        "waterDepth": data.get('water_depth'),
        "waterDensity": data.get('density_water'),
        "formationFluidDensity": data.get('density_formation_fluid'),
        "defaultUnitDepth": data.get('default_unit_depth'),
        "defaultUnitDensity": data.get('default_unit_density'),
        "notes": data.get('notes'),
        "projects": [ObjectId(project_id)],
        "wellbores": []
    }
    well_id = wells_collection.insert_one(new_well).inserted_id

    # Update project to include the new well
    projects_collection.update_one({"_id": ObjectId(project_id)}, {"$push": {"wells": well_id}})
    return jsonify({"success": True, "message": "Well added successfully", "well_id": str(well_id)}) 

@app.route('/api/wells', methods=['GET'])
def get_wells():
    print("Received request get wells by project")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    project_id = request.args.get('project_id')
    wells = wells_collection.find({"projects": ObjectId(project_id)})
    result = [{"_id": str(well["_id"]), "name": well["name"]} for well in wells]
    return jsonify(result)

@app.route('/api/wells/<well_id>', methods=['DELETE'])
def delete_well(well_id):
    print("Received request: delete well")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    project_id = request.json.get('project_id')

    wells_collection.delete_one({"_id": ObjectId(well_id)})

    projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"wells": ObjectId(well_id)}}
    )
    return jsonify({"success": True, "message": "Well {} deleted successfully".format(well_id)})

if __name__ == "__main__":
    app.run(debug=True)