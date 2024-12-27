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

@app.route("/test")
def test():
    print("test request")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    else:
        print("test in session")
    user_id = ObjectId(session['user_id'])
    projects = projects_collection.find({"user_id": ObjectId(user_id)})
    result = [{"_id": str(project["_id"]), "name": project["name"]} for project in projects]
    return jsonify(result)    

@app.route('/api/projects', methods=['GET'])
def get_projects():
    print("Received request for projects")  # Add logging for debugging

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

@app.route('/api/save_selected_project', methods=['POST'])
def save_selected_project():
    data = request.json
    project_id = data.get('project_id')
    project_name = data.get('project_name')

    if not project_id:
        return jsonify({"message": "Project ID is required"}), 400

    # Save selected project ID to the session
    session['project'] = {
        "id": project_id,
        "name": project_name
    }
    return jsonify({"message": "Project saved to session: {}".format(project_id)}), 200

@app.route('/api/get_session_project', methods=['GET'])
def get_session_project():
    print("receive request for get session project")

    session_project = session.get('project')
    if not session_project:
        return jsonify({"message": "No project selected"}), 404
    return jsonify({"id": session_project['id'], "name": session_project['name']}), 200

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
        return jsonify({"success": False, "message": "A project with the same name already exists for this user"}), 400

    print(data)
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
            "project_id": str(project_id),
            "project_name": name
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
        return jsonify({"message": "A well with the same well UID already exists for this user"}), 400
    
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
    return jsonify({"message": "Well added successfully", "well_id": str(well_id)})

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

    # Delete well
    wells_collection.delete_one({"_id": ObjectId(well_id)})

    # Remove reference from project
    projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"wells": ObjectId(well_id)}}
    )
    return jsonify({"message": "Well {well_id} deleted successfully"})


@app.route('/api/wellbores', methods=['POST'])
def add_wellbore():
    print("Received request: add wellbore")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    data = request.json
    well_id = data.get('well_id')

    # Check for duplicate project name for the same user
    wellbore_uid = data.get('uid')
    existing_welbore_uid = wellbores_collection.find_one({"uid": wellbore_uid})
    if existing_welbore_uid:
        return jsonify({"message": "A well with the same well UID already exists for this user"}), 400
    
    new_wellbore = {
        "_id": ObjectId(),
        "well_id": ObjectId(well_id),
        "name": data.get('name'),
        "uid": data.get('uid'),
        "description": data.get('description'),
        "operator": data.get('operator'),
        "status": data.get('status'),
        "purpose": data.get('purpose'),
        "analysisType": data.get('analysis_type'),
        "trajectoryShape": data.get('trajectory_shape'),
        "rigName": data.get('rig_name'),
        "objectiveInformation": data.get('objectiveInformation'),
        "airGap": data.get('air_gap'),
        "totalMD": data.get('total_md'),
        "totalTVD": data.get('total_tvd'),
        "spudDate": data.get('spud_date'),
        "completionDate": data.get('completion_date'),
        "datasets": [],
        "trajectory": {
            "md": [],
            "tvd": [],
            "inclination": [],
            "azimuth": []
        }
    }
    wellbore_id = wellbores_collection.insert_one(new_wellbore).inserted_id

    # Update well to include the new wellbore
    wells_collection.update_one({"_id": ObjectId(well_id)}, {"$push": {"wellbores": wellbore_id}})
    return jsonify({"message": "Wellbore added successfully", "welbore_id": str(wellbore_id)})

@app.route('/api/wellbores', methods=['GET'])
def get_wellbores():
    print("Received request: get wellbore")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    well_id = request.args.get('well_id')
    if not well_id:
        return jsonify({"error": "Well ID is required"}), 400
    
    try:
        # Query for wellbores linked to the provided well_id
        wellbores = wellbores_collection.find({"well_id": ObjectId(well_id)})
        result = [{"_id": str(wellbore["_id"]), "name": wellbore["name"]} for wellbore in wellbores]
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching wellbores: {e}")
        return jsonify({"error": "An error occurred while fetching wellbores"}), 500

@app.route('/api/wellbores/<wellbore_id>', methods=['DELETE'])
def delete_wellbore(wellbore_id):
    print("Received request: delete wellbore")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    well_id = request.json.get('well_id')

    # Delete wellbore
    wellbores_collection.delete_one({"_id": ObjectId(wellbore_id)})

    # Remove reference from well
    wells_collection.update_one(
        {"_id": ObjectId(well_id)},
        {"$pull": {"wellbores": ObjectId(wellbore_id)}}
    )
    return jsonify({"message": "Wellbore deleted successfully"})

# DATASETS
@app.route('/api/datasets', methods=['POST'])
def add_datasets():
    print("Received request: add datasets")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    data = request.json
    well_id = data.get('well_id')
    wellbore_id = data.get('wellbore_id')

    new_dataset = {
        "_id": ObjectId(),
        "wellbore_id": ObjectId(wellbore_id),
        "name": data.get('name'),
        "description": data.get('description'),
        "indexType": data.get('index_type'),
        "indexUnit": data.get('index_unit'),
        "referenceLevel": data.get('reference_level'),
        "referenceDate": data.get('reference_date'),
        "dataType": data.get('data_type'),
        "dataUnit": data.get('data_unit'),

        "color": data.get('color'),
        "lineStyle": data.get('line_style'),
        "lineWidth": data.get('line_width'),
        "symbol": data.get('symbol'),
        "symbolSize": data.get('symbol_size'),
        "hasText": data.get('has_text'),
        "datasets": data.get('datasets')
    }
    dataset_id = datasets_collection.insert_one(new_dataset).inserted_id

    # Update wellbore to include the new dataset
    wellbores_collection.update_one({"_id": ObjectId(wellbore_id)}, {"$push": {"datasets": dataset_id}})
    return jsonify({"message": "Dataset added successfully", "dataset_id": str(dataset_id)})

@app.route('/api/datasets', methods=['GET'])
def get_datasets_name():
    print("Received request: get datasets name")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    wellbore_id = request.args.get('wellbore_id')
    if not wellbore_id:
        return jsonify({"error": "Wellbore ID is required"}), 400

    try:
        # Query datasets linked to the provided wellbore_id
        datasets = datasets_collection.find({"wellbore_id": ObjectId(wellbore_id)})
        result = [{"_id": str(dataset["_id"]), "name": dataset["name"]} for dataset in datasets]
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching datasets: {e}")
        return jsonify({"error": "An error occurred while fetching datasets name"}), 500


@app.route('/api/datasets', methods=['DELETE'])
def delete_datasets():
    print("Received request: delete datasets")
    
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    # Retrieve the wellbore_id and dataset_ids from the request body
    wellbore_id = request.json.get('wellbore_id')
    dataset_ids = request.json.get('dataset_ids')

    if not wellbore_id or not dataset_ids:
        return jsonify({"success": False, "message": "Wellbore ID and dataset IDs are required"}), 400

    try:
        # Convert dataset_ids to ObjectId format
        object_ids = [ObjectId(dataset_id) for dataset_id in dataset_ids]

        # Delete datasets from the datasets collection
        delete_result = datasets_collection.delete_many({"_id": {"$in": object_ids}})
        print(f"Deleted {delete_result.deleted_count} datasets from datasets_collection")

        # Remove references from the wellbores collection
        update_result = wellbores_collection.update_one(
            {"_id": ObjectId(wellbore_id)},
            {"$pull": {"datasets": {"$in": object_ids}}}
        )
        print(f"Updated wellbores_collection: {update_result.modified_count} documents modified")

        return jsonify({"success": True, "message": "Datasets deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting datasets: {str(e)}")
        return jsonify({"success": False, "message": "An error occurred while deleting datasets"}), 500

# def get_project_structure_old(project_id):
#     # Fetch the project by ID
#     project = projects_collection.find_one({'_id': ObjectId(project_id)})
#     if not project:
#         return None

#     # Build the structure
#     project_structure = {
#         'project_id': str(project['_id']),
#         'project_name': project.get('name', ''),
#         'wells': []
#     }

#     # Fetch wells linked to the project
#     wells = wells_collection.find({'_id': {'$in': project.get('wells', [])}})
#     for well in wells:
#         well_structure = {
#             'well_id': str(well['_id']),
#             'well_name': well.get('name', ''),
#             'wellbores': []
#         }

#         # Fetch wellbores linked to the well
#         wellbores = wellbores_collection.find({'_id': {'$in': well.get('wellbores', [])}})
#         for wellbore in wellbores:
#             wellbore_structure = {
#                 'wellbore_id': str(wellbore['_id']),
#                 'wellbore_name': wellbore.get('name', ''),
#                 'datasets': []
#             }

#             # Fetch datasets linked to the wellbore
#             datasets = datasets_collection.find({'_id': {'$in': wellbore.get('datasets', [])}})
#             for dataset in datasets:
#                 dataset_structure = {
#                     'dataset_id': str(dataset['_id']),
#                     'dataset_name': dataset.get('dataset_name', '')
#                 }
#                 wellbore_structure['datasets'].append(dataset_structure)

#             well_structure['wellbores'].append(wellbore_structure)

#         project_structure['wells'].append(well_structure)

#     return project_structure

def get_project_structure(project_id):
    # Fetch the project by ID
    project = projects_collection.find_one({'_id': ObjectId(project_id)})
    if not project:
        return None

    # Build the structure for the project
    project_structure = {
        'text': project.get('name', 'Project'),
        'children': [],
        'type': 'project',
    }

    # Fetch wells linked to the project
    wells = wells_collection.find({'_id': {'$in': project.get('wells', [])}})
    for well in wells:
        well_structure = {
            'text': well.get('name', 'Well'),
            'children': [],
            'type': 'well'
        }

        # Fetch wellbores linked to the well
        wellbores = wellbores_collection.find({'_id': {'$in': well.get('wellbores', [])}})
        for wellbore in wellbores:
            wellbore_structure = {
                'text': wellbore.get('name', 'Wellbore'),
                'children': [],
                'type': 'wellbore'

            }

            # Fetch datasets linked to the wellbore
            datasets = datasets_collection.find({'_id': {'$in': wellbore.get('datasets', [])}})
            for dataset in datasets:
                dataset_structure = {
                    'text': dataset.get('name', 'Dataset'),
                    'type': 'dataset'

                }
                wellbore_structure['children'].append(dataset_structure)

            well_structure['children'].append(wellbore_structure)

        project_structure['children'].append(well_structure)

    return project_structure



@app.route('/api/project_data_structure', methods=['GET'])
def project_data_structure():
    print("Received request get project data structure by project")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    project_id = request.args.get('project_id')

    try:
        project_structure = get_project_structure(project_id)
        if not project_structure:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify(project_structure)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == "__main__":
    app.run(debug=True)