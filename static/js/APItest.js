$(document).ready(function () {

    // Array of random analyst names
    const randomAnalysts = ["Iqbal", "John", "Alice", "Bob", "Sarah", "Michael"];
    
    // Function to generate a random 4-letter string (e.g., "ABCD")
    const generateRandomLetters = () => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return result;
    };

    // Generate an array of random project names like "Project ABCD", "Project XYZW", etc.
    const projectNames = Array.from({ length: 26 }, () => `Project ${generateRandomLetters()}`);

    // random create well
    function generateRandomInRange(min, max) {
        return (Math.random() * (max - min) + min).toFixed(2); // Returns a float with 2 decimal places
    }

    const randomWellStatus = ["post-mortem", "pre-spud"];
    const randomBasins = ["Kutai", "North Java", "Sulawesi", "North Sumatra", "Iraq", "Malay"];
    const randomDominantGeologys = ["Sand", "Shale", "Carbonate", "Clastic"];
    const randomWaterVelocities = Math.floor( generateRandomInRange(5000, 5100) );
    
    // List of random project descriptions
    const descriptions = [
        "This is a description for the project.",
        "Project description goes here. This is a random description.",
        "Details of the well operations are described here.",
        "An exploration project in a new location.",
        "Data analysis for well production performance."
    ];

    // Function to get a random item from an array
    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Function to add a dummy project
    const addDummyProject = async () => {
        // Generate random project data
        const formData = {
            name: getRandomItem(projectNames), // Random project name like "Project ABCD"
            description: getRandomItem(descriptions), // Random project description
            analyst: getRandomItem(randomAnalysts), // Random analyst name
            default_depth_unit: "meters", // Default depth unit
            notes: "Some notes about the project.", // Placeholder notes
            date_created: new Date().toISOString() // Current date as ISO string
        };

        console.log(formData);

        try {
            // Send the form data to the backend via POST request
            const response = await axios.post(`${config.apiUrl}/api/projects`, formData, {
                headers: { 
                    "Content-Type": "application/json"
                },
                withCredentials: true, // Include cookies in the request
            });

            // Check if the response is successful
            if (response.status === 200) {
                const result = response.data;
                console.log("Project added successfully:", result);
                alert("Project added successfully!");
            } else {
                throw new Error(response.data.message || "Failed to add project");
            }

        } catch (error) {
            console.error("Error:", error);
            if (error.response) {
                console.error("Response Data:", error.response.data);
                console.error("Response Status:", error.response.status);
            }
            
            alert(error.message || "An error occurred while adding the project");
        }
    };


    // Function to add a dummy project
    const addDummyWell = async () => {
        const activeProject = getLocalActiveProject();
        const projectId = activeProject._id;

        var randomWellName = `Well ${generateRandomLetters()}`;
        const formData = {
            project_id: projectId,
            name: randomWellName,
            description: "desc",
            uid: randomWellName,
            common_name: "common name " + randomWellName,
            status: getRandomItem(randomWellStatus),
            basin_name: getRandomItem(randomBasins),
            dominant_geology: getRandomItem(randomDominantGeologys),

            water_velocity: getRandomItem(randomWaterVelocities),
            ground_elevation: generateRandomInRange(5, 20),
            water_depth: generateRandomInRange(5, 90),
            density_water: generateRandomInRange(1, 1.5),
            density_formation_fluid: generateRandomInRange(1, 1.5),
            default_unit_depth: "meters",
            default_unit_density: "sg",
            notes: "some notes",
            date_created: new Date().toISOString() // Current date as ISO string
        };

        console.log(formData);

        try {
            const result = await addWell(formData);
            if (result.success) {
                //pass
            } else {
                throw new Error(response.data.message || "Failed to add project");
            }

        } catch (error) {
            console.error("Error:", error);
            if (error.response) {
                console.error("Response Data:", error.response.data);
                console.error("Response Status:", error.response.status);
            }
            
            alert(error.message || "An error occurred while adding the project");
        }
    };

    // Make the function available globally
    window.addDummyProject = addDummyProject;
    window.addDummyWell = addDummyWell;


});
