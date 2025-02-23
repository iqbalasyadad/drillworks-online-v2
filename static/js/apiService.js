$(document).ready(function () {

  // GLOBAL FUNCTION
  function setAppHeader() {
    const activeProject = getLocalActiveProject();
    console.log(activeProject);
    const projectName = activeProject?.name || '-';
    const viewName = "-"
    $('#app-header-p').text(`Project: ${projectName} - View: ${viewName} --- ` );
  };

  async function initializeTree() {
    const activeProject = getLocalActiveProject();
    console.log("initializeTree: ", activeProject);
    $('#jstree').empty().jstree('destroy');
    if (activeProject._id) {
        try {
            const treeData = await getProjectDataStructure(activeProject._id);
            // console.log("tree: ", treeData);
            $('#jstree').jstree({
                core: { data: treeData },
                plugins: ["table"],
                table: {
                columns: [
                    { width: 200, header: "Node Name" },
                    { width: 100, header: "Details" },
                ],
                resizable: true,
                },
                themes: { theme: "apple", dots: true, icons: true },
            });
        } catch (error) {
            console.error("Error fetching project structure:", error);
        };
    };
  };

  function refreshUI() {
    setAppHeader();
    initializeTree();
    console.log("called refresh UI");
  };
  window.setAppHeader = setAppHeader;
  window.initializeTree = initializeTree;

  // END FOR GLOBAL FUNCTION

  const getUserSession = async () => {
    try {
        const response = await axios.get(`${config.apiUrl}/user-session`, {
            withCredentials: true, // Include cookies in the request
        });
        if (response.data.success) {
          console.log(response.data);
          const user = { "name": response.data.name, "_id": response.data.user_id }
          setLocalUser(user);
          return response.data;
        }

    } catch (error) {
        console.error("Error fetching session:", error.response?.data || error.message);
    }
  };
  window.getUserSession = getUserSession;

  function setLocalUser(user) {
    window.user = user;
  };

  function getLocalUser() {
    return window.user;
  };
  window.getLocalUser = getLocalUser;

  const checkSession = async () => {
    try {
        const response = await axios.get(`${config.apiUrl}/check-session`, {
            withCredentials: true, // Include cookies in the request
        });
        console.log(response.data);
    } catch (error) {
        console.error("Error fetching session:", error.response?.data || error.message);
    }
  };

  function logoutAccount() {
    $.ajax({
      url: "/logout",
      method: "GET",
      success: function(response) {
        closeProject();
        window.location.href = "/login"; // Redirect to login page
      },
      error: function() {
        alert("Error logging out.");
      }
    });
  };

  const getServerUserDataConfig = async (userId) => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/user_config/${userId}`, {
            withCredentials: true,
        });
        if (response.data.success) {
          window.userDataConfig = response.data.data_config_properties;
        }
        return response.data;
    } catch (error) {
        console.error("Error fetching user config:", error.response?.data || error.message);
        throw error;
    }
  };
  window.getServerUserDataConfig = getServerUserDataConfig;

  async function initConfig() {
    try {
      const user = await getUserSession();
      const result = await getServerUserDataConfig(user.user_id);
    } catch (error) {
        console.error("Error fetching user config:", error.message || error);
    }
  }
  window.initConfig = initConfig;

  // PROJECT
  const addProject = async (formData) => {
    try {
      const response = await axios.post(`${config.apiUrl}/api/projects`, formData, {
          headers: { 
              "Content-Type": "application/json"
          },
          withCredentials: true, // Include cookies in the request
      });
      return response.data;
    } catch (error) {
        // Handle any errors here, e.g., duplicate project name error
        console.error("Error:", error);
        alert(error.message);  // Display the error message to the user
    }
  };

  const getProjects = async () => {
      try {
          const response = await axios.get(`${config.apiUrl}/api/projects`, {
              withCredentials: true, // Include cookies with the request
          });
          return response.data;
      } catch (error) {
          console.error("Error fetching projects:", error.response?.data || error.message);
          throw error;
      }
  };

  const getProjectProperties = async (projectId, mode="basic") => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/project_properties/${projectId}`, {
            params: { mode }, // Send mode as a query parameter
            withCredentials: true, // Include cookies with the request
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching project properties:", error.response?.data || error.message);
        throw error;
    }
  };


  const updateProjectProperties = async (projectId, formData) => {
    try {
      const response = await axios.put(
        `${config.apiUrl}/api/projects/${projectId}`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // Include cookies in the request
        }
      );
      console.log("Project updated successfully:", response.data);
      return response.data;
    } catch (error) {
      // Extract error details
      if (error.response) {
        console.error("Server Error:", error.response.data.message);
        alert(`Error: ${error.response.data.message}`);
      } else if (error.request) {
        console.error("No response from server:", error.request);
        alert("Error: Unable to contact the server. Please try again.");
      } else {
        console.error("Unexpected Error:", error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const updateWellProperties = async (wellId, formData) => {
    try {
      const response = await axios.put(
        `${config.apiUrl}/api/wells/${wellId}`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // Include cookies in the request
        }
      );
      console.log("Well updated successfully:", response.data);
      return response.data;
    } catch (error) {
      // Extract error details
      if (error.response) {
        console.error("Server Error:", error.response.data.message);
        alert(`Error: ${error.response.data.message}`);
      } else if (error.request) {
        console.error("No response from server:", error.request);
        alert("Error: Unable to contact the server. Please try again.");
      } else {
        console.error("Unexpected Error:", error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };
  window.updateWellProperties = updateWellProperties;

  const updateWellboreProperties = async (wellboreId, formData) => {
    try {
      const response = await axios.put(
        `${config.apiUrl}/api/wellbores/${wellboreId}`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // Include cookies in the request
        }
      );
      console.log("Wellbore updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };
  window.updateWellboreProperties = updateWellboreProperties;
  

  const setActiveProject = async (project) => {
    console.log("setActiveProject called");
    try {
      const response = await axios.post(`${config.apiUrl}/api/set-active-project`, {
        _id: project._id,
        name: project.name
      }, {
        withCredentials: true,  // Include cookies with the request
      });
      setLocalActiveProject(project);
      refreshUI();
      
      return response;
    } catch (error) {
      console.error("Error saving project:", error.response?.data || error.message);
      throw error;
    }
  };
  
  const getActiveProject = async() => {
    console.log("call getActiveProject");
    try {
      const response = await axios.get(`${config.apiUrl}/api/get-active-project`, {
        withCredentials: true, // Include cookies with the request
      });
      if (response.data.success) {
        console.log("active project: ", response.data);
        setLocalActiveProject(response.data);
      };
      return response.data;
    } catch (error) {
        console.error("Error fetching projects:", error.response?.data || error.message);
        setLocalActiveProject(JSON.stringify({ _id: '', name: '' }));
        throw error;
    }
  };

  function setLocalActiveProject(project) {
    localStorage.setItem('activeProject', JSON.stringify({
      _id: project._id,
      name: project.name
    }));
  };

  function getLocalActiveProject() {
    const activeProject = JSON.parse(localStorage.getItem('activeProject'));
    if (!activeProject) {
      console.log("Failed to retrieve the active project");
      return;
    }
    return activeProject;
  };

  const closeProject = async () => {
    console.log("close project called");
    try {
      const response = await axios.post(`${config.apiUrl}/api/close-project`, {
        _id: '',
        name: ''
      }, {
        withCredentials: true,  // Include cookies with the request
      });
      if (response.data.success) {
        console.log(response);
        setLocalActiveProject(JSON.stringify({ _id: '', name: '' }));
        refreshUI();
      }
      return response;
    } catch (error) {
      console.error("Error saving project:", error.response?.data || error.message);
      throw error;
    }
  };

  const deleteProject = async (project, deleteWells) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/projects/${project._id}?delete_wells=${deleteWells}`, {
        method: "DELETE", // Set the method to DELETE
        headers: {
          'Content-Type': 'application/json', // Specify content type if you're sending JSON
        },
        credentials: 'include', // This is equivalent to 'withCredentials: true'
        body: JSON.stringify({ project_id: project._id, project_name: project.name }), // If needed in body
      });
  
      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
  
      return await response.json(); // Assuming the API responds with JSON data
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  const getProjectDataStructure = async (projectId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/project_data_structure?project_id=${projectId}`, {
        withCredentials: true,  // Include cookies with the request
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching projects:", error.response?.data || error.message);
      throw error;
    }
  };
  
  // WELL
  const getWells = async (query) => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/wells?${query}`, {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching wells:", error.response?.data || error.message);
        throw error;
    }
  };


  const createWell = async (formData) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wells`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) {
          throw new Error(result.message || "Failed to create well");
      }
      return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
  };

  const addProjectWells = async (formData) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/add_project_wells`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
      });

      const result = await response.json();
      return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
  };
  window.addProjectWells = addProjectWells;

  const deleteWell = async (wellId) => {
    try {
      // Send DELETE request to the server
      const response = await fetch(`${config.apiUrl}/api/wells/${wellId}`, {
        method: "DELETE",
        credentials: "include", // Include cookies for session management
        headers: { 'Content-Type': 'application/json' }, // Specify content type
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to delete well");
      }
        console.log(result.message);
      return result;
  
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    }
  };

  const removeWellsFromProject = async (projectId, wellIds) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wells/remove`, {
        method: "POST",
        credentials: "include", // Include cookies for session management
        headers: { 'Content-Type': 'application/json' }, // Specify content type
        body: JSON.stringify({ project_id: projectId, well_ids: wellIds }), // Send project_id and well_ids
      });
  
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to remove wells from project");
      }
  
      console.log(result.message);
      return result;
  
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    }
  };
  window.removeWellsFromProject = removeWellsFromProject;
  
  // WELLBORE
  const addWellbore = async (formData) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wellbores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) {
          throw new Error(result.message || "Failed to add wellbore");
      }
      return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
  };

  const getWellbores = async (wellId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/wellbores?well_id=${wellId}`, {
        withCredentials: true,  // Include cookies with the request
      });
      return response.data;
    } catch (error) {
      console.error("Error get wellbores:", error.response?.data || error.message);
      throw error;
    }
  };

  const deleteWellbore = async (wellboreId) => {
    try {
      // Send DELETE request to the server
      const response = await fetch(`${config.apiUrl}/api/wellbores/${wellboreId}`, {
        method: "DELETE",
        credentials: "include", // Include cookies for session management
        headers: { 'Content-Type': 'application/json' }, // Specify content type
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to delete wellbore");
      }
      console.log(result.message);
      return result;
  
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    }
  };

  const setWellboreSurvey = async (wellboreId, formData) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wellbore/${wellboreId}/survey`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) {
          throw new Error(result.message || "Failed to set wellbore survey");
      }
      return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
  };

  const getWellboreSurvey = async (wellboreId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/wellbore-survey?wellbore_id=${wellboreId}`, {
        withCredentials: true,  // Include cookies with the request
      });
      return response.data;
    } catch (error) {
      console.error("Error get wellbore survey:", error.response?.data || error.message);
      throw error;
    }
  };

  // DATASET
  // ADD DATASET
  const addDataset = async (formData) => {
    try {
        const response = await fetch(`${config.apiUrl}/api/datasets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
            credentials: "include",
        });

        const result = await response.json();

        if (response.status === 409) {
            // Dataset with the same name exists, ask user for confirmation
            const userConfirm = confirm(result.message); // Ask user if they want to replace
            if (userConfirm) {
                // Resend the request with confirm_replace flag
                formData.confirm_replace = true;
                return addDataset(formData); // Recursive call to handle replacement
            } else {
                alert("Dataset was not replaced.");
                return;
            }
        }

        if (!response.ok) {
            throw new Error(result.message || "Failed to add dataset");
        }
        return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + (error.message || "Unknown error"));
    }
  };


  const getDatasets = async (wellboreId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/datasets?wellbore_id=${wellboreId}`, {
        withCredentials: true,  // Include cookies with the request
      });
      return response.data;
    } catch (error) {
      console.error("Error get datasets:", error.response?.data || error.message);
      throw error;
    }
  };

  const deleteDatasets = async (wellboreId, datasetIds) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/datasets`, {
        method: "DELETE",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wellbore_id: wellboreId,
          dataset_ids: datasetIds
        })
      });
      console.log("api delete datasets");
      // console.log(dataset_ids);

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete datasets");
      }
      console.log(result.message);
      return result;
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    }
  };

  const getDatasetProperties = async (datasetId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/dataset_properties/${datasetId}`, {
        withCredentials: true, // Include cookies with the request
      });
      return response.data; // Assuming you want to return only the data portion
    } catch (error) {
      console.error("Error getting dataset properties:", error.response?.data || error.message);
      throw error;
    }
  };

  const getWellProperties = async (wellId, mode="basic") => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/well_properties/${wellId}`, {
            params: { mode }, // Send mode as a query parameter
            withCredentials: true, // Include cookies with the request
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching well properties:", error.response?.data || error.message);
        throw error;
    }
  };
  window.getWellProperties = getWellProperties;

  const getWellboreProperties = async (wellboreId, mode="basic") => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/wellbore_properties/${wellboreId}`, {
            params: { mode }, // Send mode as a query parameter
            withCredentials: true, // Include cookies with the request
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching wellbore properties:", error.response?.data || error.message);
        throw error;
    }
  };
  window.getWellboreProperties = getWellboreProperties;

  const updateDatasetProperties = async (datasetId, formData) => {
    try {
      const response = await axios.put(
        `${config.apiUrl}/api/datasets/${datasetId}`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, 
        }
      );
      console.log("Dataset updated successfully:", response.data);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("Server Error:", error.response.data.message);
        alert(`Error: ${error.response.data.message}`);
      } else if (error.request) {
        console.error("No response from server:", error.request);
        alert("Error: Unable to contact the server. Please try again.");
      } else {
        console.error("Unexpected Error:", error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  async function updateDataType(userId, dataTypeName, updateData) {
    try {
        const response = await fetch(`${config.apiUrl}/update_data_type/${userId}/${dataTypeName}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error updating data type:', error);
    }
  }
  window.updateDataType = updateDataType;

  // UNIT GROUP
  async function addUnitGroup(userId, newUnitGroup) {
    try {
        const response = await fetch(`${config.apiUrl}/api/unit_group_add_group/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUnitGroup)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error adding unit group:', error);
    }
  }
  window.addUnitGroup = addUnitGroup;


  // Make function as global access
  // Project
  window.checkSession = checkSession;
  window.logoutAccount = logoutAccount;
  window.addProject = addProject;
  window.getProjects = getProjects;
  window.getProjectProperties = getProjectProperties;
  window.updateProjectProperties = updateProjectProperties;
  window.setActiveProject = setActiveProject;
  window.getActiveProject = getActiveProject;
  window.setLocalActiveProject - setLocalActiveProject;
  window.getLocalActiveProject = getLocalActiveProject;
  window.closeProject = closeProject;
  window.deleteProject = deleteProject;
  window.getProjectDataStructure = getProjectDataStructure;

  // Well
  window.getWells = getWells;
  window.createWell = createWell;
  window.deleteWell = deleteWell;

  // Wellbore
  window.getWellbores = getWellbores;
  window.addWellbore = addWellbore;
  window.deleteWellbore = deleteWellbore;  
  window.setWellboreSurvey = setWellboreSurvey;
  window.getWellboreSurvey = getWellboreSurvey;

  // Dataset
  window.addDataset = addDataset;
  window.getDatasets = getDatasets;
  window.deleteDatasets = deleteDatasets;
  window.getDatasetProperties = getDatasetProperties;
  window.updateDatasetProperties = updateDatasetProperties;
  // window.getDatasetParameters = getDatasetParameters;


  // call initial app function
  // getActiveProject();
  // refreshUI();




});
