from flask import Flask, request, jsonify, session, render_template
# from flask_session import Session
from pymongo import MongoClient
from bson import ObjectId
from bson.json_util import dumps
import hashlib
from flask_cors import CORS  # Import CORS
from flask_talisman import Talisman

from modules import appcalculation

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
users_data_config_collection = db['users_data_config']

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
        
@app.route("/logout")
def logout():
    print("logout request")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    session.pop('user_id', None)  # Remove user_id from session
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@app.route("/check-session", methods=["GET"])
def check_session():
    if 'user_id' in session:
        print("check session, logged in")
        return jsonify({"logged_in": True}), 200  # User is logged in
    else:
        print("check session, not log in")
        return jsonify({"logged_in": False}), 200  # User is not logged in
    
@app.route("/user-session", methods=["GET"])
def user_session():
    if 'user_id' not in session:
        print("User is not logged in")
        return jsonify({"user_id": ""}), 200  # User is not logged in

    try:
        print("Fetching user session")
        # Convert the session 'user_id' to an ObjectId
        user = users_collection.find_one({'_id': ObjectId(session['user_id'])})
        
        if not user:
            print("User not found in database")
            return jsonify({"user_id": "", "message": "User not found"}), 404

        # Return user details if found
        return jsonify({"user_id": str(user['_id']), "name": user['username']}), 200
    
    except Exception as e:
        print(f"Error retrieving user session: {e}")
        return jsonify({"success": False, "message": "An error occurred while fetching the user session"}), 500
    
@app.route('/api/user_config/<user_id>', methods=['GET'])
def get_user_config(user_id):
    print("Received request for get user config: ", user_id)  # Logging for debugging

    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    try:
        # Use find_one() to get a single document
        config = users_data_config_collection.find_one({"user_id": ObjectId(user_id)})
        
        if not config:
            print("Config not found")
            return jsonify({"success": False, "message": "Config not found"}), 404
        
        # Build the response
        data_config_properties = {
            '_id': str(config['_id']),
            'data_types': config['data_types'],
            'unit_groups': config.get('unit_groups'),
        }
        return jsonify({"success": True, "data_config_properties": data_config_properties}), 200

    except Exception as e:
        print(f"Error retrieving config properties: {e}")
        return jsonify({"success": False, "message": "An error occurred while fetching the config properties"}), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
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
        "dateCreated": data.get('date_created', ''),
        "name": name,
        "description": data.get('description', ''),
        "analyst": data.get('analyst', ''),
        "defaultDepthUnit": data.get('default_depth_unit', ''),
        "notes": data.get('notes', ''),
        "users_id": [ObjectId(user_id)],
        "wells_id": [],
        "coordinateSystem": data.get('coordinate_system'),
        "UTMZoneNumber": data.get('utm_zone_number'),
        "minNorth": data.get('min_north'),
        "maxNorth": data.get('max_north'),
        "minEast": data.get('min_east'),
        "maxEast": data.get('max_east')
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

@app.route('/api/projects', methods=['GET'])
def get_projects():
    print("Received request for get projects")  # Add logging for debugging

    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    user_id = ObjectId(session['user_id'])
    projects = projects_collection.find({"users_id": ObjectId(user_id)})
    result = [{"_id": str(project["_id"]), 
               "name": project["name"],
               "analyst": project["analyst"],
               "date_created": project["dateCreated"]
               } 
               for project in projects]
    return jsonify(result)

@app.route('/api/project_properties/<project_id>', methods=['GET'])
def get_project_properties(project_id):
    """
    Retrieve properties of a specific project by its ID.
    Supports `mode` query parameter to fetch full or partial project properties.
    """
    mode = request.args.get('mode', 'basic')  # Default to 'full' if mode is not specified
    print(f"Fetching project properties for ID: {project_id} with mode: {mode}")

    try:
        # Query the database for the project
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            print("Project not found")
            return jsonify({"success": False, "message": "Project not found"}), 404

        # Basic project properties
        project_properties = {
            '_id': str(project['_id']),
            'name': project['name'],
            'description': project['description'],
            'analyst': project.get('analyst'),
            'default_depth_unit': project.get('defaultDepthUnit'),
        }

        if mode == 'full':  # Fetch additional details for 'full' mode
            project_properties.update({
                'users_id': [str(user_id) for user_id in project.get('users_id', [])],
                'notes': project.get('notes'),
                'coordinate_system': project.get('coordinateSystem'),
                'utm_zone_number': project.get('UTMZoneNumber'),
                'min_north': project.get('minNorth'),
                'max_north': project.get('maxNorth'),
                'min_east': project.get('minEast'),
                'max_east': project.get('maxEast'),
                'wells_properties': [],
                'wellbores_properties': [],
                'datasets_properties': [],
            })

            # Populate well, wellbore, and dataset properties
            for well_id in project.get('wells_id', []):
                well_properties = get_well_properties_by_id(well_id)
                project_properties['wells_properties'].append(well_properties)

                for wellbore_id in well_properties.get('wellbores_id', []):
                    wellbore_properties = get_wellbore_properties_by_id(wellbore_id)
                    project_properties['wellbores_properties'].append(wellbore_properties)

                    for dataset_id in wellbore_properties.get('datasets_id', []):
                        dataset_properties = get_dataset_properties_by_id(dataset_id)
                        project_properties['datasets_properties'].append(dataset_properties)

        return jsonify({"success": True, "project_properties": project_properties}), 200

    except Exception as e:
        print(f"Error retrieving project properties: {e}")
        return jsonify({"success": False, "message": "An error occurred while fetching the project properties"}), 500

    
@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    print(f"Received request to update project: {project_id}")
    data = request.json

    # Check if the user is authenticated
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    user_id = ObjectId(session['user_id'])

    # Fetch the project by ID and verify ownership
    try:
        existing_project = projects_collection.find_one({"_id": ObjectId(project_id), "users_id": user_id})
        if not existing_project:
            print("Project not found or unauthorized access")
            return jsonify({"success": False, "message": "Project not found or unauthorized"}), 404

    except Exception as e:
        print(f"Error while fetching project: {e}")
        return jsonify({"success": False, "message": "Failed to fetch project"}), 500

    # Update fields if provided in the request
    updated_fields = {}
    if 'name' in data:
        updated_fields['name'] = data['name']
    if 'description' in data:
        updated_fields['description'] = data['description']
    if 'analyst' in data:
        updated_fields['analyst'] = data['analyst']
    if 'default_depth_unit' in data:
        updated_fields['defaultDepthUnit'] = data['default_depth_unit']
    if 'notes' in data:
        updated_fields['notes'] = data['notes']

    # Add the updated date
    updated_fields['dateUpdated'] = data.get('date_updated', '')

    # Update the project in the database
    try:
        print(f"Updating project: {project_id} with fields: {updated_fields}")
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": updated_fields}
        )

        if result.modified_count == 0:
            print("No changes made to the project")
            return jsonify({"success": False, "message": "No changes made"}), 200

        print("Project updated successfully")
        return jsonify({"success": True, "message": "Project updated successfully"})

    except Exception as e:
        print(f"Error while updating project: {e}")
        return jsonify({"success": False, "message": "Failed to update project"}), 500


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
        return jsonify({"success": True, "_id": "", "name": ""}), 200
    return jsonify({"success": True, "_id": session_project['_id'], "name": session_project['name']}), 200

@app.route('/api/close-project', methods=['POST'])
def close_project():
    print("receive request for close project")
    data = request.json
    # project_id = data.get('_id')
    # project_name = data.get('name')

    # if not project_id:
    #     return jsonify({"message": "Project ID is required"}), 400

    # Save selected project ID to the session
    session['active_project'] = {
        "_id": "",
        "name": ""
    }
    print(session)
    return jsonify({"success": True, "message": "Current project closed"}), 200

# NEED TO BE CHECKED (IF DELETE PROJECT AND WELL ASSOSIATED REFINE CODE TO DELETE WELLBORE AND DATASET)
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
        print("delete wells not shared: ", delete_wells)

        # Delete the project itself
        projects_collection.delete_one({"_id": project_id_obj})

        wells_deleted_count = 0
        wellbores_deleted_count = 0
        datasets_deleted_count = 0

        if delete_wells:
            # Find wells with projects_id length==1 and projects_id == deleted project id
            wells_to_delete = wells_collection.find({"projects_id": {"$size": 1, "$all": [project_id_obj]}})

            for well in wells_to_delete:
                print(well["name"])
                # print("well: ", well)
                well_id = well["_id"]

                # Delete associated wellbores
                wellbores = wellbores_collection.find({"well_id": well_id})
                for wellbore in wellbores:
                    wellbore_id = wellbore["_id"]

                    # Delete associated datasets
                    result = datasets_collection.delete_many({"wellbore_id": wellbore_id})
                    datasets_deleted_count += result.deleted_count

                    # Delete wellbore
                    result = wellbores_collection.delete_one({"_id": wellbore_id})
                    wellbores_deleted_count += result.deleted_count

                # Delete the well
                result = wells_collection.delete_one({"_id": well_id})
                wells_deleted_count += result.deleted_count

        # Remove the project reference from wells
        wells_collection.update_many(
            {"projects_id": project_id_obj},
            {"$pull": {"projects_id": project_id_obj}}
        )

        return jsonify({
            "success": True,
            "message": f"Deleted {wells_deleted_count} wells, {wellbores_deleted_count} wellbores, and {datasets_deleted_count} datasets"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    wells = wells_collection.find({'_id': {'$in': project.get('wells_id', [])}})
    for well in wells:
        well_structure = {
            'text': well.get('name', 'Well'),
            'children': [],
            'type': 'well'
        }

        # Fetch wellbores linked to the well
        wellbores = wellbores_collection.find({'_id': {'$in': well.get('wellbores_id', [])}})
        for wellbore in wellbores:
            wellbore_structure = {
                'text': wellbore.get('name', 'Wellbore'),
                'children': [],
                'type': 'wellbore'
            }

            # Fetch datasets linked to the wellbore
            datasets = datasets_collection.find({'_id': {'$in': wellbore.get('datasets_id', [])}})
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


@app.route('/api/wells', methods=['POST'])
def create_well():
    print("Received request create well")
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
        "dateCreated": data.get('date_created'),
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
        "waterDensity": data.get('water_density'),
        "formationFluidDensity": data.get('formation_fluid_density'),
        "defaultUnitDepth": data.get('default_unit_depth'),
        "defaultUnitDensity": data.get('default_unit_density'),
        "notes": data.get('notes'),
        "projects_id": [ObjectId(project_id)],
        "wellbores_id": [],
        "worldLocation": data.get('world_location'),
        "area": data.get('area'),
        "country": data.get('country'),
        "field": data.get('field'),
        "blockNumber": data.get('block_number'),
        "coordinateSystem": data.get('coordinate_system'),
        "region": data.get('region'),
        "gridZoneDatum": data.get('grid_zone_datum'),
        "northing": data.get('northing'),
        "easting": data.get('easting')
    }
    well_id = wells_collection.insert_one(new_well).inserted_id

    # Update project to include the new well
    projects_collection.update_one({"_id": ObjectId(project_id)}, {"$push": {"wells_id": well_id}})
    return jsonify({"success": True, "message": "Well added successfully", "well_id": str(well_id)})

@app.route('/api/add_project_wells', methods=['POST'])
def add_project_wells():
    print("Received request to add wells to project")
    
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    data = request.json
    project_id = data.get('project_id')
    well_ids = data.get('well_ids')
    well_uids = data.get('well_uids')

    if not project_id or not well_ids or not well_uids:
        return jsonify({"success": False, "message": "Missing project_id, well_ids, or well_uids"}), 400
    try:
        well_object_ids = [ObjectId(well_id) for well_id in well_ids]
        project = projects_collection.find_one(
            {"_id": ObjectId(project_id), "wells_id": {"$in": well_object_ids}}
        )
        if project:
            return jsonify({"success": False, "message": "One or more wells are already associated with this project"}), 400
        wells_in_project = list(wells_collection.find(
            {"projects_id": ObjectId(project_id), "uid": {"$in": well_uids}}
        ))
        if len(wells_in_project) > 0:
            return jsonify({"success": False, "message": "One or more well UIDs are already associated with this project"}), 400
        projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$addToSet": {"wells_id": {"$each": well_object_ids}}}  # Avoid duplicates
        )
        wells_collection.update_many(
            {"_id": {"$in": well_object_ids}},
            {"$addToSet": {"projects_id": ObjectId(project_id)}}  # Prevent duplicate project ID for a well
        )
        return jsonify({"success": True, "message": "Wells added to project successfully"}), 200
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({"success": False, "message": "An error occurred while adding wells to the project"}), 500

@app.route('/api/wells', methods=['GET'])
def get_wells():
    print("Received request to get wells")

    # Check if user is logged in
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    # Parse query parameters
    project_id = request.args.get('project_id')
    unassociated = request.args.get('unassociated', default="false").lower() == "true"
    all_user_wells = request.args.get('all_user_wells', default="false").lower() == "true"
    all_wells = request.args.get('all_wells', default="false").lower() == "true"
    
    # Initialize query
    query = {}
    wells = []

    try:
        if project_id:
            query = {"projects_id": ObjectId(project_id)}
            wells = wells_collection.find(query)

        elif unassociated:
            query = {
                "$or": [
                    {"projects_id": {"$exists": False}},
                    {"projects_id": {"$size": 0}},
                    {"projects_id": None}
                ]
            }
            wells = wells_collection.find(query)

        elif all_user_wells:
            user_id = session['user_id']  # Get the current user's ID

            try:
                user_projects = projects_collection.find({"users_id": ObjectId(user_id)}, {"wells_id": 1})
                wells_ids = []

                for project in user_projects:
                    wells_ids.extend(project.get("wells_id", []))  # Extract well IDs from each project
                wells_ids = list(set(wells_ids))

                if wells_ids:
                    query = {"_id": {"$in": wells_ids}}  # Use the list of well IDs to query wells
                    wells = list(wells_collection.find(query))  # Fetch wells as a list
                else:
                    wells = []  # No wells found for the user's projects

            except Exception as e:
                print(f"Error fetching wells for user: {e}")
                wells = []

        elif all_wells:
            wells = wells_collection.find()  # No filter applied

        result = [{"_id": str(well["_id"]), "name": well["name"], "uid": well["uid"], "description": well["description"]
                   } for well in wells]
        return jsonify(result)

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({"success": False, "message": "An error occurred while fetching wells"}), 500


@app.route('/api/wells/<well_id>', methods=['DELETE'])
def delete_well(well_id):
    print("Received request: delete well")
    if 'user_id' not in session:
        print("not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    try:
        well = wells_collection.find_one({"_id": ObjectId(well_id)})
        if not well:
            return jsonify({"success": False, "message": f"Well {well_id} not found"}), 404
        wellbores = wellbores_collection.find({"well_id": ObjectId(well_id)})
        for wellbore in wellbores:
            wellbore_id = wellbore["_id"]
            datasets_collection.delete_many({"wellbore_id": ObjectId(wellbore_id)})
            wellbores_collection.delete_one({"_id": ObjectId(wellbore_id)})
        projects_collection.update_many(
            {"wells_id": ObjectId(well_id)},  # Find projects that contain the well
            {"$pull": {"wells_id": ObjectId(well_id)}}  # Remove the well from the wells array
        )
        wells_collection.delete_one({"_id": ObjectId(well_id)})
        return jsonify({"success": True, "message": f"Well {well_id} and its associated wellbores and datasets deleted successfully"})
    except Exception as e:
        print(f"Error deleting well: {e}")
        return jsonify({"success": False, "message": "An error occurred while deleting the well"}), 500
    
@app.route('/api/wells/remove', methods=['POST'])
def remove_wells_from_project():
    print("Received request to remove wells from project")
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    data = request.json
    project_id = data.get('project_id')
    well_ids = data.get('well_ids')

    if not project_id or not well_ids:
        return jsonify({"success": False, "message": "Project ID and well IDs are required"}), 400
    
    # Remove the well IDs from the project's wells_id list
    result_project = projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$pullAll": {"wells_id": [ObjectId(well_id) for well_id in well_ids]}}
    )
    
    # Remove the project ID from each well's projects_id list
    result_wells = wells_collection.update_many(
        {"_id": {"$in": [ObjectId(well_id) for well_id in well_ids]}},
        {"$pull": {"projects_id": ObjectId(project_id)}}
    )
    
    if result_project.modified_count == 0 or result_wells.modified_count == 0:
        return jsonify({"success": False, "message": "Failed to remove wells from project"}), 400

    return jsonify({"success": True, "message": "Wells removed from project successfully"})


@app.route('/api/well_properties/<well_id>', methods=['GET'])
def get_well_properties(well_id):
    """
    Retrieve properties of a specific well by its ID.
    """
    mode = request.args.get('mode', 'basic')  # Default to 'full' if mode is not specified
    print(f"Fetching well properties for ID: {well_id} with mode: {mode}")
    
    try:
        well_properties = get_well_properties_by_id(well_id)

        if mode=="full":
            well_properties.update({
                'datasets_properties': []
            })
                    
            for wellbore_id in well_properties['wellbores_id']:
                wellbore_properties = get_wellbore_properties_by_id(wellbore_id)
                for dataset_id in wellbore_properties['datasets_id']:
                    dataset_properties = get_dataset_properties_by_id(dataset_id)
                    well_properties['datasets_properties'].append(dataset_properties)

        return jsonify({"success": True, "well_properties": well_properties}), 200

    except Exception as e:
        print(f"Error retrieving well: {e}")
        return jsonify({"success": False, "message": "An error occurred while fetching the well properties"}), 500

def get_well_properties_by_id(well_id):
    try:
        # Validate the well_id
        well_object_id = ObjectId(well_id)
    except Exception as e:
        print(f"Invalid well ID: {e}")
        return {}

    well = wells_collection.find_one({"_id": well_object_id})

    if not well:
        print("Well not found")
        return {}

    projects_names = []
    if well.get("projects_id"):
        projects_cursor = projects_collection.find({"_id": {"$in": [ObjectId(project_id) for project_id in well["projects_id"]]}})
        projects_names = [project.get("name") for project in projects_cursor]

    # Serialize the well object
    well_properties = {
        "id": str(well["_id"]),
        "name": well.get("name"),
        "uid": well.get("uid"),
        "description": well.get("description"),
        "common_name": well.get("commonName"),
        "status": well.get("status"),
        "basin_name": well.get("basinName"),
        "dominant_geology": well.get("dominantGeology"),
        "water_velocity": well.get("waterVelocity"),
        "ground_elevation": well.get("groundElevation"),
        "water_depth": well.get("waterDepth"),
        "water_density": well.get("waterDensity"),
        "formation_fluid_density": well.get("formationFluidDensity"),
        "default_unit_depth": well.get("defaultUnitDepth"),
        "default_unit_density": well.get("defaultUnitDensity"),
        "notes": well.get("notes"),
        "projects_id": [str(project_id) for project_id in well.get("projects_id", [])],
        "projects_name": projects_names,  # Added the project names
        "wellbores_id": [str(wellbore_id) for wellbore_id in well.get("wellbores_id", [])],
        "world_location": well.get("worldLocation"),
        "area": well.get("area"),
        "country": well.get("country"),
        "field": well.get("field"),
        "block_number": well.get("blockNumber"),
        "coordinate_system": well.get("coordinateSystem"),
        "region": well.get("region"),
        "grid_zone_datum": well.get("gridZoneDatum"),
        "northing": well.get("northing"),
        "easting": well.get("easting")
    }

    return well_properties


@app.route('/api/wellbore_properties/<wellbore_id>', methods=['GET'])
def get_wellbore_properties(wellbore_id):
    """
    Retrieve properties of a specific wellbore by its ID.
    """
    mode = request.args.get('mode', 'basic')  # Default to 'full' if mode is not specified
    print(f"Fetching well properties for ID: {wellbore_id} with mode: {mode}")
    
    try:
        wellbore_properties = get_wellbore_properties_by_id(wellbore_id)

        if mode=="full":
            wellbore_properties.update({
                'datasets_properties': []
            })    
            for dataset_id in wellbore_properties['datasets_id']:
                dataset_properties = get_dataset_properties_by_id(dataset_id)
                wellbore_properties['datasets_properties'].append(dataset_properties)

        return jsonify({"success": True, "wellbore_properties": wellbore_properties}), 200

    except Exception as e:
        print(f"Error retrieving well: {e}")
        return jsonify({"success": False, "message": "An error occurred while fetching the well properties"}), 500
    
def get_wellbore_properties_by_id(wellbore_id):
    try:
        wellbore_object_id = ObjectId(wellbore_id)
    except Exception as e:
        print(f"Invalid wellbore ID: {e}")
        return {}
    
    wellbore = wellbores_collection.find_one({"_id": wellbore_object_id})

    if not wellbore:
        print("wellbore not found")
        return {}
    
    well = wells_collection.find_one({"_id": ObjectId(wellbore.get("well_id"))})
    
    wellbore_properties = {
        "id": str(wellbore["_id"]),
        "name": wellbore.get("name"),
        "well_id": str(wellbore.get("well_id")),
        "well_name": well.get("name"),
        "uid": wellbore.get("uid"),
        "description": wellbore.get("description"),
        "operator": wellbore.get("operator"),
        "analyst": wellbore.get("analyst"),
        "status": wellbore.get("status"),
        "purpose": wellbore.get("purpose"),
        "analysis_type": wellbore.get("analysisType"),
        "trajectory_shape": wellbore.get("trajectoryShape"),
        "rig_name": wellbore.get("rigName"),
        "objective_information": wellbore.get("objectiveInformation"),
        "water_depth": well.get("waterDepth"),
        "air_gap": wellbore.get("airGap"),
        "total_md": wellbore.get("totalMD"),
        "total_tvd": wellbore.get("totalTVD"),
        "spud_date": wellbore.get("spudDate"),
        "completion_date": wellbore.get("completionDate"),
        "notes": wellbore.get("notes"),
        "datasets_id": [str(dataset_id) for dataset_id in wellbore.get("datasets_id", [])],
    }

    return wellbore_properties

@app.route('/api/wellbores', methods=['POST'])
def create_wellbore():
    print("Received request: create wellbore")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    data = request.json
    well_id = data.get('well_id')
    well = wells_collection.find_one({"_id": ObjectId(well_id)})

    # Check for duplicate project name for the same user
    wellbore_uid = data.get('uid')
    existing_welbore_uid = wellbores_collection.find_one({"uid": wellbore_uid})
    if existing_welbore_uid:
        return jsonify({
            "success": False, 
            "message": "A well with the same well UID already exists for this user"}), 400
    
    new_wellbore = {
        "_id": ObjectId(),
        "well_id": ObjectId(well_id),
        "name": data.get('name'),
        "uid": data.get('uid'),
        "description": data.get('description'),
        "operator": data.get('operator'),
        "analyst": data.get('analyst'),
        "status": data.get('status'),
        "purpose": data.get('purpose'),
        "analysisType": data.get('analysis_type'),
        "trajectoryShape": data.get('trajectory_shape'),
        "rigName": data.get('rig_name'),
        "objectiveInformation": data.get('objective_information'),
        "airGap": data.get('air_gap'),
        "totalMD": data.get('total_md'),
        "totalTVD": data.get('total_tvd'),
        "spudDate": data.get('spud_date'),
        "completionDate": data.get('completion_date'),
        "notes": data.get('notes'),
        "survey": { "md": [], "tvd": [], "inclination": [], "azimuth": [] },
        "datasets_id": []
    }
    wellbore_id = wellbores_collection.insert_one(new_wellbore).inserted_id

    # Update well to include the new wellbore
    wells_collection.update_one({"_id": ObjectId(well_id)}, {"$push": {"wellbores_id": wellbore_id}})
    return jsonify({"success": True, 
                    "message": "Wellbore added successfully", 
                    "welbore_id": str(wellbore_id)})

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
        print("not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    try:
        wellbore = wellbores_collection.find_one({"_id": ObjectId(wellbore_id)})
        if not wellbore:
            return jsonify({"success": False, "message": "Wellbore not found"}), 404

        well_id = wellbore.get('well_id')
        datasets_collection.delete_many({"wellbore_id": ObjectId(wellbore_id)})
        wellbores_collection.delete_one({"_id": ObjectId(wellbore_id)})
        wells_collection.update_one(
            {"_id": ObjectId(well_id)},
            {"$pull": {"wellbores_id": ObjectId(wellbore_id)}}
        )
        return jsonify({"success": True, "message": "Wellbore and its datasets deleted successfully"})

    except Exception as e:
        print(f"Error deleting wellbore: {e}")
        return jsonify({"success": False, "message": "An error occurred while deleting the wellbore"}), 500

@app.route('/api/wellbore-survey', methods=['GET'])
def get_wellbore_survey():
    print("Received request: get wellbore survey")
    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    wellbore_id = request.args.get('wellbore_id')
    if not wellbore_id:
        return jsonify({"error": "Wellbore ID is required"}), 400
    
    try:
        wellbore = wellbores_collection.find_one({"_id": ObjectId(wellbore_id)})
        if not wellbore:
            return jsonify({"success": False, "message": "Wellbore not found"}), 404
        survey_data = wellbore.get("survey", {})
        return jsonify({
            "success": True,
            "wellbore_id": str(wellbore["_id"]),
            "survey": survey_data
        })
    except Exception as e:
        print(f"Error get wellbore survey: {e}")
        return jsonify({"error": "An error occurred while get wellbore survey"}), 500

@app.route('/api/wellbore/<wellbore_id>/survey', methods=['PUT'])
def set_survey(wellbore_id):
    print("Received request: set survey for wellbore", wellbore_id)

    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    data = request.json
    survey_data = {
        "md": data.get('md'),
        "tvd": data.get('tvd'),
        "inclination": data.get('inclination'),
        "azimuth": data.get('azimuth')
    }

    # Find the wellbore by its ID and update the survey field
    result = wellbores_collection.update_one(
        {"_id": ObjectId(wellbore_id)}, 
        {"$set": {"survey": survey_data}}
    )

    if result.matched_count == 0:
        return jsonify({
            "success": False,
            "message": f"No wellbore found with ID {wellbore_id}"
        }), 404
    result = { "success": True, "message": "Survey data updated successfully"}
    return jsonify(result)

# DATASETS
@app.route('/api/datasets', methods=['POST'])
def create_dataset():
    print("Received request: create datasets")
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    data = request.json
    wellbore_id = data.get('wellbore_id')
    dataset_name = data.get('name')
    confirm_replace = data.get('confirm_replace', False)

    # Check if a dataset with the same name exists for the given wellbore
    existing_dataset = datasets_collection.find_one({"wellbore_id": ObjectId(wellbore_id), "name": dataset_name})
    
    if existing_dataset and not confirm_replace:
        # Prompt user if they want to replace the existing dataset
        return jsonify({
            "success": False,
            "message": f"A dataset with the name '{dataset_name}' already exists. Do you want to replace it?",
            "existing_dataset_id": str(existing_dataset["_id"])
        }), 409

    if existing_dataset and confirm_replace:
        # Delete the existing dataset
        datasets_collection.delete_one({"_id": existing_dataset["_id"]})
        wellbores_collection.update_one(
            {"_id": ObjectId(wellbore_id)},
            {"$pull": {"datasets_id": existing_dataset["_id"]}}
        )
        print(f"Deleted existing dataset with ID: {existing_dataset['_id']}")

    # Add the new dataset
    new_dataset = {
        "_id": ObjectId(),
        "wellbore_id": ObjectId(wellbore_id),
        "method": data.get('method'),
        "name": dataset_name,
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
        "hasTextColumn": data.get('has_text_column'),
        "data": data.get('data'),
        "dateCreated": data.get('date_created'),
    }
    dataset_id = datasets_collection.insert_one(new_dataset).inserted_id

    # Update wellbore to include the new dataset
    wellbores_collection.update_one({"_id": ObjectId(wellbore_id)}, {"$push": {"datasets_id": dataset_id}})
    return jsonify({"success": True, "message": "Dataset added successfully", "dataset_id": str(dataset_id)})



@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    print("Received request: get datasets list")
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

    print(wellbore_id, dataset_ids)

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
            {"$pull": {"datasets_id": {"$in": object_ids}}}
        )
        print(f"Updated wellbores_collection: {update_result.modified_count} documents modified")

        return jsonify({"success": True, "message": "Datasets deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting datasets: {str(e)}")
        return jsonify({"success": False, "message": "An error occurred while deleting datasets"}), 500

def get_dataset_properties_by_id(dataset_id):
    try:
        dataset_object_id = ObjectId(dataset_id)
    except Exception as e:
        print(f"Invalid dataset ID: {e}")
        return {}
    
    dataset = datasets_collection.find_one({"_id": dataset_object_id})
    wellbore = wellbores_collection.find_one({"_id": dataset.get("wellbore_id")})
    well = wells_collection.find_one({"_id": ObjectId(wellbore.get("well_id"))})

    if not dataset:
        print("dataset not found")
        return {}
    
    dataset_properties = {
        "_id": dataset_id,
        "wellbore_id": str(dataset.get("wellbore_id")),
        "wellbore_name": wellbore.get("name"),
        "well_id": str(wellbore.get("well_id")),
        "well_name": well.get("name"),
        "method": dataset.get('method'),
        "name": dataset.get('name'),
        "description": dataset.get('description'),
        "index_type": dataset.get('indexType'),
        "index_unit": dataset.get('indexUnit'),
        "reference_level": dataset.get('referenceLevel'),
        "reference_date": dataset.get('referenceDate'),
        "data_type": dataset.get('dataType'),
        "data_unit": dataset.get('dataUnit'),
        "color": dataset.get('color'),
        "line_style": dataset.get('lineStyle'),
        "line_width": dataset.get('lineWidth'),
        "symbol": dataset.get('symbol'),
        "symbol_size": dataset.get('symbolSize'),
        "has_text_column": dataset.get('hasTextColumn'),
        "data": dataset.get('data'),
        "date_created": dataset.get('dateCreated')
    }

    return dataset_properties

@app.route('/api/dataset_properties/<dataset_id>', methods=['GET'])
def get_dataset_properties(dataset_id):
    """
    Retrieve properties of a specific dataset by its ID.
    """
    print(f"Fetching dataset properties for ID: {dataset_id}")
    
    try:
        dataset_properties = get_dataset_properties_by_id(dataset_id) 
        return jsonify({"success": True, "dataset_properties": dataset_properties}), 200

    except Exception as e:
        print(f"Error retrieving dataset: {e}")
        return jsonify({"success": False, "message": "An error occurred while fetching the dataset"}), 500
    
@app.route('/api/datasets/<dataset_id>', methods=['PUT'])
def update_dataset(dataset_id):
    print(f"Received request to update dataset: {dataset_id}")
    data = request.json

    # Check if the user is authenticated
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    # Fetch the project by ID and verify ownership
    try:
        existing_dataset = datasets_collection.find_one({"_id": ObjectId(dataset_id)})
        if not existing_dataset:
            print("Dataset not found or unauthorized access")
            return jsonify({"success": False, "message": "Project not found or unauthorized"}), 404

    except Exception as e:
        print(f"Error while fetching dataset: {e}")
        return jsonify({"success": False, "message": "Failed to fetch dataset"}), 500

    # Update fields if provided in the request
    updated_fields = {}
    updated_fields['name'] = data['name']
    updated_fields['description'] = data['description']
    updated_fields['dataType'] = data['data_type']
    updated_fields['dataUnit'] = data['data_unit']
    updated_fields['indexType'] = data['index_type']
    updated_fields['indexUnit'] = data['index_unit']
    updated_fields['referenceLevel'] = data['reference_level']
    updated_fields['data'] = data['data']
    updated_fields['dateUpdated'] = data.get('date_updated', '')

    # Update the project in the database
    try:
        result = datasets_collection.update_one(
            {"_id": ObjectId(dataset_id)},
            {"$set": updated_fields}
        )

        if result.modified_count == 0:
            print("No changes made to the dataset")
            return jsonify({"success": False, "message": "No changes made"}), 200

        print("Dataset updated successfully")
        return jsonify({"success": True, "message": "Dataset updated successfully"})

    except Exception as e:
        print(f"Error while updating dataset: {e}")
        return jsonify({"success": False, "message": "Failed to update dataset"}), 500

@app.route('/api/wells/<well_id>', methods=['PUT'])
def update_well(well_id):
    print(f"Received request to update well: {well_id}")
    data = request.json

    if 'user_id' not in session:
        print("not  in session")
        return jsonify({"success": False, "message": "User not in session"}), 401
    
    data = request.json
    project_id = data.get('project_id')

    try:
        existing_well = wells_collection.find_one({"_id": ObjectId(well_id)})
        if not existing_well:
            print("Well not found or unauthorized access")
            return jsonify({"success": False, "message": "Well not found or unauthorized"}), 404

    except Exception as e:
        print(f"Error while fetching dataset: {e}")
        return jsonify({"success": False, "message": "Failed to fetch well"}), 500
    
    updated_fields = {
        "name": data.get('name'),
        "description": data.get('description'),
        "uid": data.get('uid'),
        "commonName": data.get('common_name'),
        "status": data.get('status'),
        "basinName": data.get('basin_name'),
        "dominantGeology": data.get('dominant_geology'),
        "waterVelocity": data.get('water_velocity'),
        "groundElevation": data.get('ground_elevation'),
        "waterDepth": data.get('water_depth'),
        "waterDensity": data.get('water_density'),
        "formationFluidDensity": data.get('formation_fluid_density'),
        "defaultUnitDepth": data.get('default_unit_depth'),
        "defaultUnitDensity": data.get('default_unit_density'),
        "notes": data.get('notes'),
        # "projects_id": [ObjectId(project_id)],
        # "wellbores_id": [],
        "worldLocation": data.get('world_location'),
        "area": data.get('area'),
        "country": data.get('country'),
        "field": data.get('field'),
        "blockNumber": data.get('block_number'),
        "coordinateSystem": data.get('coordinate_system'),
        "region": data.get('region'),
        "gridZoneDatum": data.get('grid_zone_datum'),
        "northing": data.get('northing'),
        "easting": data.get('easting')
    }
    try:
        print(f"Updating well: {well_id} with fields: {updated_fields}")
        result = wells_collection.update_one(
            {"_id": ObjectId(well_id)},
            {"$set": updated_fields}
        )

        if result.modified_count == 0:
            print("No changes made to the well")
            return jsonify({"success": True, "message": "No changes made"}), 200

        print("Well updated successfully")
        return jsonify({"success": True, "message": "Well updated successfully"})

    except Exception as e:
        print(f"Error while updating well: {e}")
        return jsonify({"success": False, "message": "Failed to update well"}), 500
    
@app.route('/api/wellbores/<wellbore_id>', methods=['PUT'])
def update_wellbore(wellbore_id):
    print(f"Received request to update wellbore: {wellbore_id}")
    data = request.json

    # Check if the user is authenticated
    if 'user_id' not in session:
        print("User not in session")
        return jsonify({"success": False, "message": "User not in session"}), 401

    # Fetch the project by ID and verify ownership
    try:
        existing_wellbore = wellbores_collection.find_one({"_id": ObjectId(wellbore_id)})
        if not existing_wellbore:
            print("Wellbore not found or unauthorized access")
            return jsonify({"success": False, "message": "Wellbore not found or unauthorized"}), 404

    except Exception as e:
        print(f"Error while fetching wellbore: {e}")
        return jsonify({"success": False, "message": "Failed to fetch wellbore"}), 500

    # Update fields if provided in the request
    updated_fields = {}
    updated_fields['name'] = data['name']
    updated_fields['description'] = data['description']
    updated_fields['uid'] = data['uid']
    updated_fields['operator'] = data['operator']
    updated_fields['analyst'] = data['analyst']
    updated_fields['status'] = data['status']
    updated_fields['purpose'] = data['purpose']
    updated_fields['analysisType'] = data['analysis_type']
    updated_fields['trajectoryShape'] = data['trajectory_shape']
    updated_fields['rigName'] = data['rig_name']
    updated_fields['objectiveInformation'] = data['objective_information']
    updated_fields['airGap'] = data['air_gap']
    updated_fields['totalMD'] = data['total_md']
    updated_fields['totalTVD'] = data['total_tvd']
    updated_fields['spudDate'] = data['spud_date']
    updated_fields['completionDate'] = data['completion_date']
    updated_fields['notes'] = data['notes']
    updated_fields['survey'] = data['survey']
    updated_fields['dateUpdated'] = data.get('date_updated', '')

    # Update the project in the database
    try:
        result = wellbores_collection.update_one(
            {"_id": ObjectId(wellbore_id)},
            {"$set": updated_fields}
        )

        if result.modified_count == 0:
            print("No changes made to the wellbore")
            return jsonify({"success": False, "message": "No changes made"}), 200

        print("Wellbore updated successfully")
        return jsonify({"success": True, "message": "Wellbore updated successfully"})

    except Exception as e:
        print(f"Error while updating wellbore: {e}")
        return jsonify({"success": False, "message": "Failed to welbore dataset"}), 500
    
if __name__ == "__main__":
    app.run(debug=True)