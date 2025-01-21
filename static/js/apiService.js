$(document).ready(function () {


  function setAppHeader() {
    const activeProject = getLocalActiveProject();
    console.log(activeProject);
    const projectName = activeProject?.name || '-';
    const viewName = "-"
    $('#app-header-p').text(`Project: ${projectName} - View: ${viewName} --- ` );
  };

  function refreshUI() {
    setAppHeader();
    console.log("called refresh UI");
  };

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
            window.location.href = "/login"; // Redirect to login page
        },
        error: function() {
            alert("Error logging out.");
        }
    });
  };

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

  const getProjectProperties = async (projectId) => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/project_properties/${projectId}`, {
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
  

  const setActiveProject = async (project) => {
    console.log("setActiveProject called");
    try {
      const response = await axios.post(`${config.apiUrl}/api/set-active-project`, {
        _id: project._id,
        name: project.name
      }, {
        withCredentials: true,  // Include cookies with the request
      });
      localStorage.setItem('activeProject', JSON.stringify({
        _id: project._id,
        name: project.name
      }));
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
      // console.log(response);
      localStorage.setItem('activeProject', JSON.stringify(response.data));

      return response.data;
    } catch (error) {
        console.error("Error fetching projects:", error.response?.data || error.message);
        localStorage.setItem('activeProject', JSON.stringify({}));
        throw error;
    }
  };

  function getLocalActiveProject() {
    const activeProject = JSON.parse(localStorage.getItem('activeProject'));
    if (!activeProject) {
      console.log("Failed to retrieve the active project");
      return;
    }
    return activeProject;
  };

  const closeProject = async (project) => {
    console.log("close project called");
    try {
      const response = await axios.post(`${config.apiUrl}/api/close-project`, {
        _id: '',
        name: ''
      }, {
        withCredentials: true,  // Include cookies with the request
      });
      localStorage.setItem('activeProject', JSON.stringify({
        _id: '',
        name: ''
      }));
      refreshUI();
      
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
  const getWells = async (projectId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/wells?project_id=${projectId}`, {
        withCredentials: true,  // Include cookies with the request
      });
      return response.data;
    } catch (error) {
      console.error("Error get wells:", error.response?.data || error.message);
      throw error;
    }
  };

  const addWell = async (formData) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wells`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) {
          throw new Error(result.message || "Failed to add well");
      }
      return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
  };

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
  const addDataset = async (formData) => {
    try {
        const response = await fetch(`${config.apiUrl}/api/datasets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
            credentials: "include",
        });

        const result = await response.json();
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

  // const getDatasetParameters = async (datasetId) => {
  //   try {
  //     const response = await axios.get(`${config.apiUrl}/api/dataset_parameters/${datasetId}`, {
  //       withCredentials: true, // Include cookies with the request
  //     });
  //     return response.data; // Assuming you want to return only the data portion
  //   } catch (error) {
  //     console.error("Error getting dataset properties:", error.response?.data || error.message);
  //     throw error;
  //   }
  // };

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
  window.getLocalActiveProject = getLocalActiveProject;
  window.closeProject = closeProject;
  window.deleteProject = deleteProject;
  window.getProjectDataStructure = getProjectDataStructure;

  // Well
  window.getWells = getWells;
  window.addWell = addWell;
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
