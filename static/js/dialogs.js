$(document).ready(function () {
             
    // const apiUrl = config.apiUrl; // Replace with your API URL
    let currentPage = 1;
    const totalPages = 2;

    function showPage(page) {
        $(".page-dialog-create-project").hide();
        $(`.page-dialog-create-project[data-page="${page}"]`).show();

        const stepTitles = {
            1: "Step 1: Basic Details",
            2: "Step 2: Project Notes",
        };
        $("#dialog-create-project").dialog("option", "title", stepTitles[page]);
        updateButtonStates();
    }

    function updateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", currentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", currentPage === totalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", currentPage !== totalPages);
    }  

    // Initialize the dialog
    $("#dialog-create-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        dialog: true,
        buttons: {
            "< Back": function () {
                if (currentPage > 1) {
                    currentPage--;
                    showPage(currentPage);
                }
            },
            "Next >": function () {
                if (currentPage < totalPages) {
                    currentPage++;
                    showPage(currentPage);
                }
            },
            Finish: async function () {
                // Handle finish logic
                const formData = {
                    name: $("#dialog-create-project-name").val(),
                    description: $("#dialog-create-project-description").val(),
                    analyst: $("#dialog-create-project-analyst").val(),
                    default_depth_unit: $("#dialog-create-project-default-depth-unit").val(),
                    notes: $("#dialog-create-project-notes").val(),
                    date_created: new Date()
                };
            
                if (!formData.name) {
                    alert("Please enter a project name!");
                    return;
                }
            
                try {
                    const response = await axios.post(`${config.apiUrl}/api/projects`, formData, {
                        headers: { 
                            "Content-Type": "application/json"
                        },
                        withCredentials: true, // Include cookies in the request
                    });
            
                    // Check if the response is successful
                    if (response.data.success) {
                        console.log(response.data);
                        setActiveProject(response.data.project);
                        alert(response.data.message);
                        
                    } else {
                        throw new Error(response.data.message || "Failed to add project");
                    }
            
                } catch (error) {
                    // Handle any errors here, e.g., duplicate project name error
                    console.error("Error:", error);
                    alert(error.message);  // Display the error message to the user
                }
            
                // Close the dialog after the request is finished
                $(this).dialog("close");
            },
            
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        open: ()=> {
            console.log("open dialog");
            currentPage=1;
            showPage(currentPage);
        },
        close: () => {
            $("#form-create-project")[0].reset();
        }
    });

    // menubar-project-open-dialog
    // Function to format the date as YYYY/MM/DD
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.getFullYear() + '/' + (date.getMonth() + 1).toString().padStart(2, '0') + '/' + date.getDate().toString().padStart(2, '0');
    };

    var dataSet = [];
    var openProjectTable = $('#project-open-table').DataTable({
        paging: false,
        scrollCollapse: true,
        scrollY: 200,
        info: false,
        // order: [[0, 'asc']],
        // bDestroy: true,
        retrieve: true,
        ordering: false,
        columns: [
            { title: 'Name', data: 'name' },
            { title: 'Analyst', data: 'analyst' },
            { title: 'Date Created', data: 'date_created' }
        ],
        data: dataSet,
    });
    
    var openProjectTableSelectedProject;
    $('#project-open-table').on('click', 'tr', function () {
        // toggleOpenButton();
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            openProjectTableSelectedProject=null;
        }
        else {
            openProjectTable.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
            openProjectTableSelectedProject = openProjectTable.row(this).data();
        }
        console.log("tr clicked", this);
        console.log(openProjectTableSelectedProject);
        
    });

    $("#dialog-open-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        dialog: true,
        buttons: {
            Open: {
                // id: "menubar-project-open-dialog-open-btn",
                text: "Open",
                // disabled: true,
                async click() {
                    const dialog = $(this);
                    if (openProjectTableSelectedProject) {
                        try {
                            const result = await setActiveProject(openProjectTableSelectedProject);
                            console.log("Save result:", result);
                
                            if (result.statusText === "OK") {
                                dialog.dialog("close");  // Use the stored reference to close the dialog
                            }
                        } catch (error) {
                            console.error("Failed to save project:", error.message);
                        }
                    } else {
                        window.alert("Please select a project!")
                    }
                }
            },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        },
        open: async ()=> {
            openProjectTable.columns.adjust().draw();
            try {
                const projectsArray = await getProjects();
                const formattedData = projectsArray.map(item => {
                    return {
                        ...item,
                        date_created: formatDate(item.date_created)
                    };
                });
                console.log(formattedData);
                openProjectTable.clear();
                openProjectTable.rows.add(formattedData);
                openProjectTable.draw();
            } catch(error) {
                console.error("Failed to fetch projects:", error.message);
            }
            openProjectTable.columns.adjust().draw();
            
        },
        close: function () {
            openProjectTable.$('tr.selected').removeClass('selected');
            openProjectTableSelectedProject = null;
        }
    });

    // Dialog delete project
    var deleteProjectTable = $('#project-delete-table').DataTable({
        paging: false,
        scrollCollapse: true,
        scrollY: 170,
        info: false,
        retrieve: true,
        ordering: false,
        columns: [
            { title: 'Name', data: 'name' },
            { title: 'Analyst', data: 'analyst' },
            { title: 'Date Created', data: 'date_created' }
        ],
        data: dataSet,
    });

    var deleteProjectTableSelectedProject;
    $('#project-delete-table').on('click', 'tr', function () {
        // toggleOpenButton();
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            deleteProjectTableSelectedProject=null;
        }
        else {
            deleteProjectTable.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
            deleteProjectTableSelectedProject = deleteProjectTable.row(this).data();
        }
        console.log(deleteProjectTableSelectedProject);
        
    });

    // DIALOG DELETE PROJECT
    $("#dialog-delete-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        dialog: true,
        buttons: {
            Delete: {
                text: "Delete",
                async click() {
                    const dialog = $(this);
                    if (deleteProjectTableSelectedProject) {
                        const isConfirmed = window.confirm(`Are you sure you want to delete the project: ${deleteProjectTableSelectedProject.name}?`);
                        if (isConfirmed) {
                            var deleteWellsChecked = $("#dialog-delete-project-delete-wells-checkbox").prop("checked");
                            try {
                                const response = await deleteProject(deleteProjectTableSelectedProject, deleteWellsChecked);
                                console.log("Response:", response);
                    
                                if (response.success) {
                                    alert("Project deleted successfully!");
                                    dialog.dialog("close");  // Use the stored reference to close the dialog
                                }
                            } catch (error) {
                                console.error("Failed to delete project:", error.message);
                            }
                        }
                    } else {
                        window.alert("Please select a project!")
                    }
                }
            },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        },
        open: async ()=> {
            deleteProjectTable.columns.adjust().draw();
            try {
                const projectsArray = await getProjects();
                const formattedData = projectsArray.map(item => {
                    return {
                        ...item,
                        date_created: formatDate(item.date_created)
                    };
                });
                console.log(formattedData);
                deleteProjectTable.clear();
                deleteProjectTable.rows.add(formattedData);
                deleteProjectTable.draw();
            } catch(error) {
                console.error("Failed to fetch projects:", error.message);
            }
            deleteProjectTable.columns.adjust().draw();
            
        },
        close: function () {
            deleteProjectTable.$('tr.selected').removeClass('selected');
            deleteProjectTableSelectedProject = null;
        }
    });

    // CREATE WELL
    let dialogWellCreateCurrentPage = 1;
    const dialogWellCreatetotalPages = 2;

    function dialogWellCreateShowPage(page) {
        $(".page-dialog-create-well").hide();
        $(`.page-dialog-create-well[data-page="${page}"]`).show();

        // Dynamically update the dialog title with the current step
        const stepTitles = {
            1: "Step 1: Collect Well General Information",
            2: "Step 2: Well Notes",
        };
        $("#dialog-create-well").dialog("option", "title", stepTitles[page]);

        dialogWellCreateUpdateButtonStates();
    }

    function dialogWellCreateUpdateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", dialogWellCreateCurrentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", dialogWellCreateCurrentPage === dialogWellCreatetotalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogWellCreateCurrentPage !== dialogWellCreatetotalPages);
    }
    // DIALOG CREATE WELL
    $("#dialog-create-well").dialog({
        autoOpen: false,
        height: 400,
        width: 450,
        dialog: true,
        buttons: {
            "< Back": function () {
                if (dialogWellCreateCurrentPage > 1) {
                    dialogWellCreateCurrentPage--;
                    dialogWellCreateShowPage(dialogWellCreateCurrentPage);
                }
            },
            "Next >": function () {
                if (dialogWellCreateCurrentPage < dialogWellCreatetotalPages) {
                    dialogWellCreateCurrentPage++;
                    dialogWellCreateShowPage(dialogWellCreateCurrentPage);
                }
            },
            Finish: {
                text: "Finish",
                async click() {
                    try {
                        // Fetch the selected project ID
                        const activeProject = getLocalActiveProject();
                        const projectId = activeProject._id;
                
                        // Gather form data
                        const formData = {
                            project_id: projectId,
                            name: $("#dialog-create-well-name").val(),
                            description: $("#dialog-create-well-description").val(),
                            uid: $("#dialog-create-well-uid").val(),
                            common_name: $("#dialog-create-well-common-well-name").val(),
                            status: $("#dialog-create-well-status-select").val(),
                            basin_name: $("#dialog-create-well-basin-name").val(),
                            dominant_geology: $("#dialog-create-well-dominan-geology-select").val(),
                            water_velocity: parseFloat($("#dialog-create-well-water-velocity").val()),
                            ground_elevation: parseFloat($("#dialog-create-well-ground-elevation").val()),
                            water_depth: parseFloat($("#dialog-create-well-water-depth").val()),
                            density_water: parseFloat($("#dialog-create-well-density-water").val()) || null,
                            density_formation_fluid: parseFloat($("#dialog-create-well-density-formation-fluid").val()) || null,
                            default_unit_depth: $("#dialog-create-well-default-unit-depth-select").val(),
                            default_unit_density: $("#dialog-create-well-default-unit-density-select").val(),
                            notes: $("#dialog-create-well-notes").val(),
                            date_created: new Date().toISOString() // Current date as ISO string
                        };
                
                        // Validate required fields
                        if (!formData.name) {
                            alert("Please enter a well name!");
                            return;
                        }
                        if (!formData.uid) {
                            alert("Please enter a well UID!");
                            return;
                        }
                
                        console.log("Creating a new well with the following data:", formData);

                        const result = await addWell(formData);
                        if (result.success) {
                            alert("Well added successfully!");
                            $(this).dialog("close");
                        } else {
                            throw new Error(response.data.message || "Failed to add project");
                        }
                        
                    } catch (error) {
                        console.error("Error:", error);
                        alert("An error occurred: " + error.message);
                    }
                }
            },
            
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        open: ()=> {
            console.log("open dialog");
            dialogWellCreateCurrentPage=1;
            dialogWellCreateShowPage(dialogWellCreateCurrentPage);
        },
        close: () => {
            $("#dialog-form-create-well")[0].reset();
        }
    });

    // DELETE WELL
    const fetchWellsToSelect = async(projectId, selectElement) => {
        const wells = await getWells(projectId);
        selectElement.empty(); // Clear previous options
        wells.forEach(well => {
            selectElement.append(`<option value="${well._id}">${well.name}</option>`);
        });
    };

    // DIALOG DELETE WELL
    $("#dialog-delete-well").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        dialog: true,
        buttons: {
            Delete: {
                text: "Delete",
                async click() {
                    const dialog = $(this);

                    // Fetch the selected project ID
                    const activeProject = getLocalActiveProject();
                    const projectId = activeProject._id;

                    const selectedWellId = $("#dialog-delete-well-select").val();
                    const selectedWellName = $("#dialog-delete-well-select option:selected").text();
                    console.log("wellname: ", selectedWellName);

                    if (selectedWellId) {
                        const isConfirmed = window.confirm(`Are you sure you want to delete the well: ${selectedWellName}?`);
                        if (isConfirmed) {
                            try {
                                const result = await deleteWell( projectId, selectedWellId);
                                console.log("Response:", result);
                    
                                if (result.success) {
                                    // alert("Well deleted successfully!");
                                    const wellSelect = $('#dialog-delete-well-select');
                                    fetchWellsToSelect(projectId, wellSelect);
                                    // dialog.dialog("close");  // Use the stored reference to close the dialog
                                }
                            } catch (error) {
                                console.error("Failed to delete well:", error.message);
                            }
                        }
                    } else {
                        window.alert("Please select a well!")
                    }
                }
            },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        },
        open: async ()=> {
            console.log("fetch wells called");
            try {
        
                // Fetch the selected project ID
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-delete-well-select');
                fetchWellsToSelect(projectId, wellSelect);
        
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
            
        },
        close: function () {
            $('#dialog-delete-well-select').empty()
            //pass
        }
    });


    // WELLBORE
    let dialogWellboreCreateCurrentPage = 1;
    const dialogWellboreCreatetotalPages = 3;

    function dialogWellboreCreateShowPage(page) {
        $(".page-dialog-create-wellbore").hide();
        $(`.page-dialog-create-wellbore[data-page="${page}"]`).show();

        // Dynamically update the dialog title with the current step
        const stepTitles = {
            1: "Step 1: Specify Data Source",
            2: "Step 2: Collect Wellbore Information",
            3: "Step 3: Wellbore Notes",
        };
        $("#dialog-create-wellbore").dialog("option", "title", stepTitles[page]);

        dialogWellCreateUpdateButtonStates();
    }

    function dialogWellCreateUpdateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", dialogWellboreCreateCurrentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", dialogWellboreCreateCurrentPage === dialogWellboreCreatetotalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogWellboreCreateCurrentPage !== dialogWellboreCreatetotalPages);
    }
    // DIALOG CREATE WELLBORE
    $("#dialog-create-wellbore").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        dialog: true,
        buttons: {
            "< Back": function () {
                if (dialogWellboreCreateCurrentPage > 1) {
                    dialogWellboreCreateCurrentPage--;
                    dialogWellboreCreateShowPage(dialogWellboreCreateCurrentPage);
                }
            },
            "Next >": function () {
                if (dialogWellboreCreateCurrentPage < dialogWellboreCreatetotalPages) {
                    dialogWellboreCreateCurrentPage++;
                    dialogWellboreCreateShowPage(dialogWellboreCreateCurrentPage);
                }
            },
            Finish: {
                text: "Finish",
                async click() {
                    try {
                        // Fetch the selected project ID
                        const activeProject = getLocalActiveProject();
                        const projectId = activeProject._id;
                
                        // Gather form data
                        const formData = {
                            project_id: projectId,
                            name: $("#dialog-create-wellbore-name").val(),
                            description: $("#dialog-create-wellbore-description").val(),
                            uid: $("#dialog-create-wellbore-uid").val(),
                            common_name: $("#dialog-create-wellbore-common-well-name").val(),
                            status: $("#dialog-create-wellbore-status-select").val(),
                            basin_name: $("#dialog-create-wellbore-basin-name").val(),
                            dominant_geology: $("#dialog-create-wellbore-dominan-geology-select").val(),
                            water_velocity: parseFloat($("#dialog-create-wellbore-water-velocity").val()),
                            ground_elevation: parseFloat($("#dialog-create-wellbore-ground-elevation").val()),
                            water_depth: parseFloat($("#dialog-create-wellbore-water-depth").val()),
                            density_water: parseFloat($("#dialog-create-wellbore-density-water").val()) || null,
                            density_formation_fluid: parseFloat($("#dialog-create-wellbore-density-formation-fluid").val()) || null,
                            default_unit_depth: $("#dialog-create-wellbore-default-unit-depth-select").val(),
                            default_unit_density: $("#dialog-create-wellbore-default-unit-density-select").val(),
                            notes: $("#dialog-create-wellbore-notes").val(),
                            date_created: new Date().toISOString() // Current date as ISO string
                        };
                
                        // Validate required fields
                        if (!formData.name) {
                            alert("Please enter a well name!");
                            return;
                        }
                        if (!formData.uid) {
                            alert("Please enter a well UID!");
                            return;
                        }
                
                        console.log("Creating a new well with the following data:", formData);

                        const result = await addWellbore(formData);
                        if (result.success) {
                            alert("Well added successfully!");
                            $(this).dialog("close");
                        } else {
                            throw new Error(response.data.message || "Failed to add project");
                        }
                        
                    } catch (error) {
                        console.error("Error:", error);
                        alert("An error occurred: " + error.message);
                    }
                }
            },
            
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        open: ()=> {
            console.log("open dialog");
            dialogWellboreCreateCurrentPage=1;
            dialogWellboreCreateShowPage(dialogWellboreCreateCurrentPage);

            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const wellboreSelect = $('#dialog-create-wellbore-well-target-select');
            fetchWellsToSelect(projectId, wellboreSelect);

        },
        close: () => {
            $("#dialog-form-create-wellbore")[0].reset();
        }
    });

});