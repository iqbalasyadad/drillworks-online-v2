$(document).ready(function () {

    // DIALOG: DATASET PARAMETERS
    async function openDialogDatasetParameters(datasetId) {
        $("#dialog-global-dataset-parameters").dialog({
            autoOpen: false,
            height: 400,
            width: 300,
            modal: true,
            buttons: {
                Cancel: {
                    text: "Cancel",
                    click: function() {
                        $(this).dialog("close");
                    }
                }
            },
            open: async ()=> {
                try {
                    const result = await getDatasetProperties(datasetId)
                    if (result.success) {
                        console.log(result.dataset_properties);
                        const parametersText = datasetPropertiesToParametersText(result.dataset_properties);
                        $("#dialog-global-dataset-parameters-textarea").val(parametersText);
                    }
                } catch (error) {
                    console.error("Error get dataset properties:", error);
                };
            },
            close: function () {
                $("#dialog-global-dataset-parameters-textarea").val("");
            }
        });
        $("#dialog-global-dataset-parameters").dialog("open");
    }
             
    // CREATE PROJECT
    let dialogProjectCreateCurrentPage = 1;
    const dialogProjectCreateTotalPages = 3;

    function dialogProjectCreateShowPage(page) {
        $(".page-dialog-create-project").hide();
        $(`.page-dialog-create-project[data-page="${page}"]`).show();

        const stepTitles = {
            1: "Step 1: Basic Details",
            2: "Step 2: Specify Project Boundary Information",
            3: "Step 3: Project Notes"
        };
        $("#dialog-create-project").dialog("option", "title", stepTitles[page]);
        dialogProjectCreateUpdateButtonStates();
    }

    function dialogProjectCreateUpdateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", dialogProjectCreateCurrentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", dialogProjectCreateCurrentPage === dialogProjectCreateTotalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogProjectCreateCurrentPage < dialogProjectCreateTotalPages-1);
    }  

    // DIALOG CREATE PROJECT
    $("#dialog-create-project").dialog({
        autoOpen: false,
        height: 300,
        width: 400,
        modal: true,
        position: { my: "center", at: "center", of: window },
        buttons: {
            "< Back": function () {
                if (dialogProjectCreateCurrentPage > 1) {
                    dialogProjectCreateCurrentPage--;
                    dialogProjectCreateShowPage(dialogProjectCreateCurrentPage);
                }
            },
            "Next >": function () {
                if (dialogProjectCreateCurrentPage < dialogProjectCreateTotalPages) {
                    dialogProjectCreateCurrentPage++;
                    dialogProjectCreateShowPage(dialogProjectCreateCurrentPage);
                }
            },
            Finish: async function () {
                const formData = {
                    date_created: new Date(),
                    name: $("#dialog-create-project-name").val(),
                    description: $("#dialog-create-project-description").val(),
                    analyst: $("#dialog-create-project-analyst").val(),
                    default_depth_unit: $('input[name="dialog-create-project-default-depth-unit"]:checked').val(),
                    notes: $("#dialog-create-project-notes").val(),
                    coordinate_system: $("#dialog-create-project-coordinate-system-select").val(),
                    utm_zone_number: $("#dialog-create-project-utm-zone-number-select").val(),
                    min_north: parseFloat($("#dialog-create-project-boundaries-min-north")),
                    max_north: parseFloat($("#dialog-create-project-boundaries-max-north")),
                    min_east: parseFloat($("#dialog-create-project-boundaries-min-north")),
                    max_east: parseFloat($("#dialog-create-project-boundaries-max-north")),
                };
                console.log(formData);
            
                if (!formData.name) {
                    alert("Please enter a project name!");
                    return;
                }
            
                try {
                    const response = await addProject(formData);
                    if (response.success) {
                        console.log(response);
                        setActiveProject(response.project);
                    } else {
                        throw new Error(response.message || "Failed to add project");
                    }
                } catch (error) {
                    console.error("Error:", error);
                    alert(error.message);  // Display the error message to the user
                }
                $(this).dialog("close");
            },
            
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        open: ()=> {
            dialogProjectCreateCurrentPage=1;
            dialogProjectCreateShowPage(dialogProjectCreateCurrentPage);
        },
        close: () => {
            $("#form-create-project")[0].reset();
        }
    });

    const openProjectTable = new ProjectDataTable('#project-open-table');

    // DIALOG OPEN PROJECT
    $("#dialog-open-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
        buttons: {
            Open: {
                text: "Open",
                async click() {
                    const selectedProject = openProjectTable.getSelectedRows();
                    if (selectedProject) {
                        try {
                            const result = await setActiveProject(selectedProject);
                            console.log("Save result:", result);
                
                            if (result.statusText === "OK") {
                                $(this).dialog("close");
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
            // openProjectTable.columns.adjust().draw();
            try {
                const projectsArray = await getProjects();
                const formattedData = projectsArray.map(item => {
                    return {
                        ...item,
                        date_created: formatDate(item.date_created)
                    };
                });
                openProjectTable.render(formattedData);
            } catch(error) {
                console.error("Failed to fetch projects:", error.message);
            }
        },
        close: function () {
            // openProjectTable.$('tr.selected').removeClass('selected');
            // openProjectTableSelectedProject = null;
        }
    });

    const activeProject = getLocalActiveProject();
    if (!activeProject._id) {
        $("#dialog-open-project").dialog("open");
    };

    // DELETE PROJECT
    const deleteProjectTable = new ProjectDataTable('#project-delete-table');

    // DIALOG DELETE PROJECT
    $("#dialog-delete-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
        buttons: {
            Delete: {
                text: "Delete",
                async click() {
                    const selectedProject = deleteProjectTable.getSelectedRows();
                    if (selectedProject) {
                        const isConfirmed = window.confirm(`Are you sure you want to delete the project: ${selectedProject.name}?`);
                        if (isConfirmed) {
                            var deleteWellsChecked = $("#dialog-delete-project-delete-wells-checkbox").prop("checked");
                            try {
                                const response = await deleteProject(selectedProject, deleteWellsChecked);
                                console.log("Response:", response);
                    
                                if (response.success) {
                                    $(this).dialog("close");
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
            try {
                const projectsArray = await getProjects();
                const formattedData = projectsArray.map(item => {
                    return {
                        ...item,
                        date_created: formatDate(item.date_created)
                    };
                });
                deleteProjectTable.render(formattedData);
            } catch(error) {
                console.error("Failed to fetch projects:", error.message);
            }            
        },
        close: function () {
            $('#dialog-delete-project-delete-wells-checkbox').prop('checked', false);
        }
    });

    // PROPERTIES PROJECT
    const propertiesProjectWellTable = new WellDataTable('#dialog-properties-project-well-table');
    const propertiesProjectWellboreTable = new WellboreDataTable('#dialog-properties-project-wellbore-table');
    const propertiesProjectDatasetTable = new DatasetDataTable('#dialog-properties-project-dataset-table');

    // $("#dialog-properties-project-dataset-parameters-btn").prop("disabled", !propertiesProjectDatasetTable.getSelectedRows());
    $("#dialog-properties-project-dataset-parameters-btn").click(function () {
        openDialogDatasetParameters(propertiesProjectDatasetTable.getSelectedRows()._id);
    });

    // DIALOG PROPERTIES PROJECT
    $("#dialog-properties-project").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            Apply: {
                // id: "menubar-project-open-dialog-open-btn",
                text: "Apply",
                // disabled: true,
                async click() {
                    const activeProject = getLocalActiveProject();
                    const projectId = activeProject._id;
                    const formData = {
                        project_id: projectId,
                        name: $("#dialog-properties-project-name").val(),
                        description: $("#dialog-properties-project-description").val(),
                        analyst: $("#dialog-properties-project-analyst").val(),
                        default_depth_unit: $("#dialog-properties-project-default-depth-unit-select").val(),
                        notes: $("#dialog-properties-project-notes").val(),
                        date_updated: new Date()
                    };
                    console.log(formData);
                
                    if (!formData.name) {
                        alert("Please enter a project name!");
                        return;
                    }
                
                    try {
                        const response = await updateProjectProperties(projectId, formData);
                        if (response.success) {
                            initializeTree();
                        } else {
                            throw new Error(response.message || "Failed to update project");
                        }
                    } catch (error) {
                        console.error("Error:", error);
                        alert(error.message);  // Display the error message to the user
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
            $('#dialog-properties-project-tabs').tabs({ active: 0 });
            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            try {
                const result = await getProjectProperties(projectId, mode="full");
                if (result.success) {
                    console.log(result.project_properties);
                    $("#dialog-properties-project-name").val(result.project_properties.name);
                    $("#dialog-properties-project-description").val(result.project_properties.description);
                    $("#dialog-properties-project-analyst").val(result.project_properties.analyst);
                    $("#dialog-properties-project-notes").val(result.project_properties.notes);
                    $("#dialog-properties-project-default-depth-unit-select").val(result.project_properties.default_depth_unit);
                    $("#dialog-properties-project-tabs").tabs({
                        activate: function (event, ui) {
                            const activeTabId = ui.newPanel.attr("id");
                            if (activeTabId==="dialog-properties-project-tabs-4") {
                                propertiesProjectWellTable.render(result.project_properties.wells_properties);
                            } else if (activeTabId==="dialog-properties-project-tabs-5") {
                                propertiesProjectWellboreTable.render(result.project_properties.wellbores_properties);
                            } else if (activeTabId==="dialog-properties-project-tabs-7") {
                                propertiesProjectDatasetTable.render(result.project_properties.datasets_properties);
                            }
                        },
                    });
                };
            } catch (error) {
                console.error("Error get datasets:", error);
            };
        },
        close: function () {
            $('#dialog-properties-project-form')[0].reset();
        }
    });

    // CREATE WELL
    let dialogWellCreateCurrentPage = 1;
    const dialogWellCreateTotalPages = 3;

    function dialogWellCreateShowPage(page) {
        $(".page-dialog-create-well").hide();
        $(`.page-dialog-create-well[data-page="${page}"]`).show();

        // Dynamically update the dialog title with the current step
        const stepTitles = {
            1: "Step 1: Collect Well General Information",
            2: "Step 2: Collect Well Location Information",
            3: "Step 3: Well Notes"
        };
        $("#dialog-create-well").dialog("option", "title", stepTitles[page]);

        dialogWellCreateUpdateButtonStates();
    }

    function dialogWellCreateUpdateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", dialogWellCreateCurrentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", dialogWellCreateCurrentPage === dialogWellCreateTotalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogWellCreateCurrentPage < dialogWellCreateTotalPages-1);
    }
    // DIALOG CREATE WELL
    $("#dialog-create-well").dialog({
        autoOpen: false,
        height: 370,
        width: 450,
        modal: true,
        buttons: {
            "< Back": function () {
                if (dialogWellCreateCurrentPage > 1) {
                    dialogWellCreateCurrentPage--;
                    dialogWellCreateShowPage(dialogWellCreateCurrentPage);
                }
            },
            "Next >": function () {
                if (dialogWellCreateCurrentPage < dialogWellCreateTotalPages) {
                    dialogWellCreateCurrentPage++;
                    dialogWellCreateShowPage(dialogWellCreateCurrentPage);
                }
            },
            Finish: {
                text: "Finish",
                async click() {
                    try {
                        const activeProject = getLocalActiveProject();
                        const projectId = activeProject._id;
                
                        const formData = {
                            date_created: new Date().toISOString(),
                            project_id: projectId,
                            name: $("#dialog-create-well-name").val(),
                            description: $("#dialog-create-well-description").val(),
                            uid: $("#dialog-create-well-uid").val(),
                            common_name: $("#dialog-create-well-common-well-name").val(),
                            status: $("#dialog-create-well-status-select").val(),
                            basin_name: $("#dialog-create-well-basin-name").val(),
                            dominant_geology: $("#dialog-create-well-dominant-geology-select").val(),
                            water_velocity: parseFloat($("#dialog-create-well-water-velocity").val()),
                            ground_elevation: parseFloat($("#dialog-create-well-ground-elevation").val()),
                            water_depth: parseFloat($("#dialog-create-well-water-depth").val()),
                            water_density: parseFloat($("#dialog-create-well-water-density").val()) || null,
                            formation_fluid_density: parseFloat($("#dialog-create-well-formation-fluid-density").val()) || null,
                            default_unit_depth: $("#dialog-create-well-default-unit-depth-select").val(),
                            default_unit_density: $("#dialog-create-well-default-unit-density-select").val(),
                            notes: $("#dialog-create-well-notes").val(),
                            world_location: $("#dialog-create-well-location-world-location").val(),
                            area: $("#dialog-create-well-location-area").val(),
                            country: $("#dialog-create-well-location-country").val(),
                            field: $("#dialog-create-well-location-field").val(),
                            block_number: $("#dialog-create-well-location-block-number").val(),
                            coordinate_system: $("#dialog-create-well-location-coordinate-system-select").val(),
                            region: $("#dialog-create-well-location-region-select").val(),
                            grid_zone_datum: $("#dialog-create-well-location-grid-zone-datum-select").val(),
                            northing: parseFloat($("#dialog-create-well-location-northing").val()),
                            easting: parseFloat($("#dialog-create-well-location-easting").val())
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

                        const result = await createWell(formData);
                        if (result.success) {
                            console.log("Create well: success: ", result);
                            $(this).dialog("close");
                            initializeTree();
                        } else {
                            throw new Error(response.data.message || "Failed to creaete well");
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
            dialogWellCreateCurrentPage=1;
            dialogWellCreateShowPage(dialogWellCreateCurrentPage);

            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;

            (async function fetchProjectProperties() {
                try {
                    const response  = await getProjectProperties(projectId);
                    console.log(response);
                    if (response.success) {
                        $("#dialog-create-well-default-unit-depth-select").val(response.project_properties.default_depth_unit);
                    };
                } catch (error) {
                    console.error("Failed to fetch project properties:", error);
                }
            })();

        },
        close: () => {
            $("#dialog-form-create-well")[0].reset();
        }
    });

    // DELETE WELL
    // DIALOG DELETE WELL
    $("#dialog-delete-well").dialog({
        autoOpen: false,
        height: 350,
        width: 350,
        modal: true,
        buttons: {
            Delete: {
                text: "Delete",
                async click() {
                    // const dialog = $(this);
                    const wellSelect = $('#dialog-delete-well-select');
                    const wellSelectedName = wellSelect.find("option:selected").text();
                    const wellSelectedId = wellSelect.val();
                    if (wellSelectedId) {
                        const isConfirmed = window.confirm(`Are you sure you want to delete the well: ${wellSelectedName}?`);
                        if (isConfirmed) {
                            try {
                                const result = await deleteWell(wellSelectedId);
                                console.log("Response:", result);
                    
                                if (result.success) {
                                    // alert("Well deleted successfully!");
                                    const activeProject = getLocalActiveProject();
                                    const projectId = activeProject._id;
                                    fetchWellsToSelect(projectId, wellSelect);
                                    // dialog.dialog("close");  // Use the stored reference to close the dialog
                                    initializeTree();
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

    // ADD WELL
    const addWellWellsTable = new AddWelldataTable('#dialog-add-well-well-list-table');
    // DIALOG ADD WELL
    $("#dialog-add-well").dialog({
        autoOpen: false,
        height: 500,
        width: 500,
        modal: true,
        buttons: {
            OK: {
                text: "OK",
                async click() {
                    const activeProject = getLocalActiveProject();
                    const projectId = activeProject._id;
                    const chekcedWells = addWellWellsTable.getCheckedRows();
                    console.log(chekcedWells);
                    
                    if (!chekcedWells) { return };

                    const formData = {
                        project_id: projectId,
                        well_ids: chekcedWells.map(well => well._id),
                        well_uids: chekcedWells.map(well => well.uid)
                    };
                    console.log(formData);
                
                    try {
                        const response = await addProjectWells(formData);
                        console.log(response);
                        if (response.success) {
                            initializeTree();
                        } else {
                            throw new Error(response.message || "Failed to add well(s)");
                        }
                    } catch (error) {
                        console.error("Error:", error);
                        alert(error.message); 
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
            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const projectSelect = $('#dialog-add-well-list-wells-by-project-project-select');
            const wellsFilterRadio = $('input[name="dialog-add-well-list-wells-radio"]');
            let wells;
        
            try {
                let projects = await getProjects();
                projects = projects.filter(project => project._id !== projectId);
        
                projectSelect.empty();
                projects.forEach(project => {
                    projectSelect.append(`<option value="${project._id}">${project.name}</option>`);
                });
        
                if (projectSelect.find('option').length > 0) {
                    projectSelect.prop('selectedIndex', 0).change();
                }
            } catch (error) {
                console.error("Error populating projects:", error);
            }
        
            // Update project dropdown state based on radio selection
            const updateProjectSelectState = () => {
                const radioSelectValue = wellsFilterRadio.filter(':checked').val();
                if (radioSelectValue !== "list_wells_option_1") {
                    projectSelect.attr('disabled', true); // Disable project dropdown
                } else {
                    projectSelect.removeAttr('disabled'); // Enable project dropdown
                }
            };
        
            // Add event listener to the radio buttons
            wellsFilterRadio.off('change').on('change', async function () {
                updateProjectSelectState(); // Enable/disable the dropdown as needed
                const selectedRadio = wellsFilterRadio.filter(':checked').val();
                let query;
        
                if (selectedRadio === "list_wells_option_1") {
                    query = `project_id=${projectSelect.val()}`;
                } else if (selectedRadio === "list_wells_option_2") {
                    query = "unassociated=true";
                } else if (selectedRadio === "list_wells_option_3") {
                    query = "all_user_wells=true";
                } else if (selectedRadio === "list_wells_option_4") {
                    query = "all_wells=true";
                }
        
                try {
                    wells = await getWells(query);
                    addWellWellsTable.render(wells);
                } catch (error) {
                    console.error("Error fetching wells:", error);
                }
            });
        
            // Add event listener to the project dropdown
            projectSelect.off('change').on('change', async function () {
                const selectedRadio = wellsFilterRadio.filter(':checked').val();
        
                if (selectedRadio === "list_wells_option_1") {
                    const query = `project_id=${projectSelect.val()}`;
                    try {
                        wells = await getWells(query);
                        addWellWellsTable.render(wells);
                    } catch (error) {
                        console.error("Error fetching wells on project change:", error);
                    }
                }
            });
        
            updateProjectSelectState();
            wellsFilterRadio.trigger('change'); // Trigger the initial change to fetch wells
        },
        close: function () {
            $("input[name='dialog-add-well-list-wells-radio'][value='list_wells_option_1']").prop("checked",true);

        }
    });

    // REMOVE WELL
    // DIALOG REMOVE WELL
    $("#dialog-remove-well").dialog({
        autoOpen: false,
        height: 350,
        width: 350,
        modal: true,
        buttons: {
            Delete: {
                text: "Remove",
                async click() {
                    const activeProject = getLocalActiveProject();
                    const projectId = activeProject._id;
                    const wellSelect = $('#dialog-remove-well-select');
                    const wellSelectedNames = wellSelect.find("option:selected").text();
                    const wellSelectedIds = wellSelect.val();
                    console.log(wellSelectedIds);
                    if (!wellSelectedIds) {
                        alert('Select a well to remove!');
                        return
                    }
                    try {
                        const result = await removeWellsFromProject(projectId, wellSelectedIds);
                        console.log("Response:", result);
                        if (result.success) {
                            fetchWellsToSelect(projectId, wellSelect);
                            initializeTree();
                            console.log("removed wells: ", wellSelectedNames);
                        }
                    } catch (error) {
                        console.error("Failed to remove well:", error.message);
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
            try {
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-remove-well-select');
                fetchWellsToSelect(projectId, wellSelect);
        
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
            
        },
        close: function () {
            $('#dialog-remove-well-select').empty()
        }
    });

    // PROPERTIES WELL
    const propertiesWellDatasetTable = new DatasetDataTable('#dialog-properties-well-dataset-table');

    $("#dialog-properties-well-dataset-parameters-btn").click(function () {
        openDialogDatasetParameters(propertiesWellDatasetTable.getSelectedRows()._id);
    });

    // DIALOG PROPERTIES WELL
    $("#dialog-properties-well").dialog({
        autoOpen: false,
        height: 410,
        width: 650,
        modal: true,
        buttons: {
            Apply: {
                text: "Apply",
                async click() {
                    const activeProject = getLocalActiveProject();
                    const projectId = activeProject._id;

                    var selectedWellId  = $("#dialog-properties-well-well-select").val();

                    try {
                        const formData = {
                            date_updated: new Date().toISOString(),
                            project_id: projectId,
                            name: $("#dialog-properties-well-name").val(),
                            description: $("#dialog-properties-well-description").val(),
                            uid: $("#dialog-properties-well-uid").val(),
                            common_name: $("#dialog-properties-well-common-well-name").val(),
                            status: $("#dialog-properties-well-status-select").val(),
                            basin_name: $("#dialog-properties-well-basin-name").val(),
                            dominant_geology: $("#dialog-properties-well-dominant-geology-select").val(),
                            water_velocity: parseFloat($("#dialog-properties-well-water-velocity").val()),
                            ground_elevation: parseFloat($("#dialog-properties-well-ground-elevation").val()),
                            water_depth: parseFloat($("#dialog-properties-well-water-depth").val()),
                            water_density: parseFloat($("#dialog-properties-well-water-density").val()) || null,
                            formation_fluid_density: parseFloat($("#dialog-properties-well-formation-fluid-density").val()) || null,
                            default_unit_depth: $("#dialog-properties-well-default-unit-depth-select").val(),
                            default_unit_density: $("#dialog-properties-well-default-unit-density-select").val(),
                            notes: $("#dialog-properties-well-notes").val(),
                            world_location: $("#dialog-properties-well-location-world-location").val(),
                            area: $("#dialog-properties-well-location-area").val(),
                            country: $("#dialog-properties-well-location-country").val(),
                            field: $("#dialog-properties-well-location-field").val(),
                            block_number: $("#dialog-properties-well-location-block-number").val(),
                            coordinate_system: $("#dialog-properties-well-location-coordinate-system-select").val(),
                            region: $("#dialog-properties-well-location-region-select").val(),
                            grid_zone_datum: $("#dialog-properties-well-location-grid-zone-datum-select").val(),
                            northing: parseFloat($("#dialog-properties-well-location-northing").val()),
                            easting: parseFloat($("#dialog-properties-well-location-easting").val())
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
                
                        console.log("Updating a well with the following data:", formData);

                        const result = await updateWellProperties(selectedWellId, formData);
                        if (result.success) {
                            console.log("Update well properties: success: ", result);
                            // $(this).dialog("close");
                            initializeTree();
                        } else {
                            throw new Error(response.data.message || "Failed to update well properties");
                        }
                        
                    } catch (error) {
                        console.error("Error:", error);
                        alert("An error occurred: " + error.message);
                    }

                }
            },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close")
                }
            }
        },
        open: async ()=> {
            $('#dialog-properties-well-tabs').tabs({ active: 0 });
            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const wellSelect = $("#dialog-properties-well-well-select");
            const includedInProjectSelect = $("#dialog-properties-well-included-in-project-select");
            
            try {
                await fetchWellsToSelect(projectId, wellSelect);
                wellSelect.off('change').on('change', async function () {
                    const selectedWellId = $(this).val();
                    try {
                        const result = await getWellProperties(selectedWellId, mode="full");
                        if (result.success) {
                            console.log(result.well_properties);

                            // tab general
                            $('#dialog-properties-well-name').val(result.well_properties.name);
                            $('#dialog-properties-well-description').val(result.well_properties.description);
                            $('#dialog-properties-well-uid').val(result.well_properties.uid);
                            $('#dialog-properties-well-common-well-name').val(result.well_properties.common_name);
                            $('#dialog-properties-well-status-select').val(result.well_properties.status);
                            $('#dialog-properties-well-basin-name').val(result.well_properties.basin_name);
                            $('#dialog-properties-well-dominant-geology-select').val(result.well_properties.dominant_geology);
                            $('#dialog-properties-well-water-velocity').val(result.well_properties.water_velocity);
                            $('#dialog-properties-well-water-depth').val(result.well_properties.water_depth);
                            $('#dialog-properties-well-ground-elevation').val(result.well_properties.ground_elevation);
                            $('#dialog-properties-well-water-density').val(result.well_properties.water_density);
                            $('#dialog-properties-well-formation-fluid-density').val(result.well_properties.formation_fluid_density);
                            $("#dialog-properties-well-default-unit-depth-select").val(result.well_properties.default_unit_depth);
                            $("#dialog-properties-well-default-unit-density-select").val(result.well_properties.default_unit_density);
                            $("#dialog-properties-well-notes").val(result.well_properties.notes);

                            // tab location
                            $('#dialog-properties-well-location-world-location').val(result.well_properties.world_location);
                            $('#dialog-properties-well-location-area').val(result.well_properties.area);
                            $('#dialog-properties-well-location-country').val(result.well_properties.country);
                            $('#dialog-properties-well-location-field').val(result.well_properties.field);
                            $('#dialog-properties-well-location-block-number').val(result.well_properties.block_number);
                            $('#dialog-properties-well-location-coordinate-system-select').val(result.well_properties.coordinate_system);
                            $('#dialog-properties-well-location-region-select').val(result.well_properties.region);
                            $('#dialog-properties-well-location-grid-zone-datum-select').val(result.well_properties.grid_zone_datum);
                            $('#dialog-properties-well-location-northing').val(result.well_properties.northing);
                            $('#dialog-properties-well-location-easting').val(result.well_properties.easting);

                            // fetch included in project names
                            includedInProjectSelect.empty();
                            result.well_properties.projects_name.forEach(projectName => {
                                includedInProjectSelect.append(`<option value="">${projectName}</option>`);
                            });

                            $("#dialog-properties-well-tabs").tabs({
                                activate: function (event, ui) {
                                    handleTabActivation(ui.newPanel.attr("id"));
                                },
                            });
                            
                            const activeTabId = $("#dialog-properties-well-tabs .ui-tabs-active").attr("aria-controls");
                            handleTabActivation(activeTabId);
                            
                            function handleTabActivation(tabId) {
                                if (tabId === "dialog-properties-well-tabs-3") {
                                    propertiesWellDatasetTable.render(result.well_properties.datasets_properties);
                                }
                            }

                        };
                    } catch(error) {
                        console.error("Error get well properties:", error);
                    };
                });
                if (wellSelect.find('option').length > 0) {
                    wellSelect.prop('selectedIndex', 0).change();
                }
            } catch (error) {
                console.error("Error fetch wells:", error);
            };

        },
        close: function () {
            $('#dialog-properties-well-well-select').empty();
            $('#dialog-properties-well-included-in-project-select').empty();
            $("#dialog-properties-well-form")[0].reset();
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

        dialogWellboreCreateUpdateButtonStates();

        if (page===2) {
            const wellSelectedName = $("#dialog-create-wellbore-well-select").find("option:selected").text();            
            $("#dialog-create-wellbore-name").val(`${wellSelectedName}_`);
            $("#dialog-create-wellbore-uid").val(`${wellSelectedName}_`);

        };
    }

    function dialogWellboreCreateUpdateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", dialogWellboreCreateCurrentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", dialogWellboreCreateCurrentPage === dialogWellboreCreatetotalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogWellboreCreateCurrentPage < dialogWellboreCreatetotalPages-1);
    }
    // DIALOG CREATE WELLBORE
    $("#dialog-create-wellbore").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
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
                            well_id: $("#dialog-create-wellbore-well-select").val(),
                            name: $("#dialog-create-wellbore-name").val(),
                            description: $("#dialog-create-wellbore-description").val(),
                            uid: $("#dialog-create-wellbore-uid").val(),
                            operator: $("#dialog-create-wellbore-operator").val(),
                            analyst: $("#dialog-create-wellbore-analyst").val(),
                            status: $("#dialog-create-wellbore-status-select").val(),
                            purpose: $("#dialog-create-wellbore-purpose-select").val(),
                            analysis_type: $("#dialog-create-wellbore-analysis-type-select").val(),
                            trajectory_shape: $("#dialog-create-wellbore-trajectory-shape-select").val(),
                            rig_name: $("#dialog-create-wellbore-rig-name").val(),
                            objective_information: $("#dialog-create-wellbore-objective-information").val(),
                            air_gap: parseFloat($("#dialog-create-wellbore-air-gap").val()),
                            total_md: parseFloat($("#dialog-create-wellbore-total-md").val()),
                            total_tvd: parseFloat($("#dialog-create-wellbore-total-tvd").val()),
                            spud_date: $("#dialog-create-wellbore-spud-date").val(),
                            completion_date: $("#dialog-create-wellbore-completion-date").val(),
                            notes: $("#dialog-create-wellbore-notes").val(),
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
                
                        console.log("Creating a new wellbore:", formData);

                        const result = await addWellbore(formData);
                        if (result.success) {
                            $(this).dialog("close");
                            initializeTree();
                        } else {
                            throw new Error(response.data.message || "Failed to add wellbore");
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
            dialogWellboreCreateCurrentPage=1;
            dialogWellboreCreateShowPage(dialogWellboreCreateCurrentPage);

            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const wellSelect = $('#dialog-create-wellbore-well-select');
            fetchWellsToSelect(projectId, wellSelect);

        },
        close: () => {
            $("#dialog-form-create-wellbore")[0].reset();
        }
    });

    // DELETE WELLBORE
    // DIALOG DELETE WELLBORE
    $("#dialog-delete-wellbore").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
        buttons: {
            Delete: {
                text: "Delete",
                async click() {
                    const selectedWellId = $("#dialog-delete-wellbore-well-select").val();
                    const wellboreSelect = $("#dialog-delete-wellbore-wellbore-select");
                    var selectedWellbore = {
                        _id: wellboreSelect.val(),
                        name: wellboreSelect.find("option:selected").text()
                    }
                    if (selectedWellbore._id) {
                        const isConfirmed = window.confirm(`Are you sure you want to delete the wellbore: ${selectedWellbore.name}?`);
                        if (isConfirmed) {
                            try {
                                const result = await deleteWellbore( selectedWellbore._id);
                                console.log("Response:", result);
                    
                                if (result.success) {
                                    fetchWellboresToSelect(selectedWellId, wellboreSelect);
                                    selectedWellbore = {};
                                    initializeTree();
                                }
                            } catch (error) {
                                console.error("Failed to delete wellbore:", error.message);
                            }
                        }
                    } else {
                        window.alert("Please select a wellbore!")
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
            try {
        
                // Fetch the selected project ID
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-delete-wellbore-well-select');
                const wellboreSelect = $('#dialog-delete-wellbore-wellbore-select');

                fetchWellsWellboresToSelect(projectId, wellSelect, wellboreSelect);
        
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
            
        },
        close: function () {
            $('#dialog-delete-wellbore-select').empty()
            //pass
        }
    });


    // WELLBORE EDIT SURVEY DATA
    var gridSurveyWellbore = new gridTableSurvey("dialog-wellbore-edit-survey-data-grid");

    // DIALOG WELLBORE EDIT SURVEY DATA
    $("#dialog-wellbore-edit-survey-data").dialog({
        autoOpen: false,
        height: 550,
        width: 500,
        modal: true,
        buttons: {
            Apply: {
                text: "Apply",
                async click() {
                    const wellboreSelect = $("#dialog-wellbore-edit-survey-data-wellbore-select");
                    var selectedWellbore = {
                        _id: wellboreSelect.val(),
                        name: wellboreSelect.find("option:selected").text()
                    }
                    if (!selectedWellbore._id) {
                        window.alert("Please select a wellbore")
                        return;
                    };
                    let calculateTVDchecked = $("#page-dialog-wellbore-edit-survey-data-calculate-tvd-checkbox").prop("checked");
                    gridSurveyWellbore.calcTVD = calculateTVDchecked;
                    const gridData = gridSurveyWellbore.getFormattedData();

                    if(!gridData.ok) {
                        console.error(gridData.message);
                        return;
                    }
                    const surveyData = {
                        md: gridData.data[0],
                        inclination: gridData.data[2],
                        azimuth: gridData.data[3]
                    }
                    if (calculateTVDchecked) {
                        const tvd = calculateTVD(gridData.data[0], gridData.data[2]);
                        surveyData["tvd"] = tvd;
                        gridSurveyWellbore.render(surveyData);
                    } else {
                        surveyData["tvd"] = gridData.data[1];
                    }

                    try {
                        const result = await setWellboreSurvey(selectedWellbore._id, formData=surveyData);
                        if (result.success) {
                            console.log("set survey success");
                        } else {
                            throw new Error(response.data.message || "Failed to add wellbore");
                        }
                    } catch (error) {
                        console.error("Error:", error);
                        alert("An error occurred: " + error.message);
                    };
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
            gridSurveyWellbore.render(surveyData=null);
            try {
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-wellbore-edit-survey-data-well-select');
                const wellboreSelect = $('#dialog-wellbore-edit-survey-data-wellbore-select');

                fetchWellsToSelect(projectId, wellSelect);
                let selectedWellId = null;
                let selectedWellboreId = null;
                wellSelect.off('change').on('change', async function () {
                    selectedWellId = $(this).val();
                    fetchWellboresToSelect(selectedWellId, wellboreSelect);
                    selectedWellboreId = null;
                    gridSurveyWellbore.render(surveyData=null);
                });
                wellboreSelect.off('change').on('change', async function () {
                    selectedWellboreId = $(this).val();
                    const wellboreSurveyResult = await getWellboreSurvey(selectedWellboreId);
                    if (wellboreSurveyResult.success) {
                        gridSurveyWellbore.render(wellboreSurveyResult.survey);
                    } else {
                        throw new Error(response.data.message || "Failed to get survey");
                    };
                    
                });
        
            } catch (error) {
                console.error("Failed to fetch survey:", error.message);
            }
        },
        close: function () {
            $('#dialog-wellbore-edit-survey-data-well-select').empty();
            $('#dialog-wellbore-edit-survey-data-wellbore-select').empty();
            $('#page-dialog-wellbore-edit-survey-data-calculate-tvd-checkbox').prop('checked', false);
        }
    });

    // PROPERTIES WELLBORE
    const propertiesWellboreDatasetTable = new DatasetDataTable('#dialog-properties-wellbore-dataset-table');

    $("#dialog-properties-wellbore-dataset-parameters-btn").click(function () {
        openDialogDatasetParameters(propertiesWellboreDatasetTable.getSelectedRows()._id);
    });

    // EDIT SURVEY PROPERTIES WELLBORE
    var gridSurveyWellboreProperties = new gridTableSurvey("dialog-wellbore-properties-edit-survey-data-grid");

    // DIALOG PROPERTIES WELLBORE
    $("#dialog-properties-wellbore").dialog({
        autoOpen: false,
        height: 450,
        width: 680,
        modal: true,
        buttons: {
            Apply: {
                text: "Apply",
                async click() {
                    const activeProject = getLocalActiveProject();
                    const projectId = activeProject._id;
                    const wellboreSelect = $("#dialog-properties-wellbore-wellbore-select");
                    var selectedWellbore = {
                        _id: wellboreSelect.val(),
                        name: wellboreSelect.find("option:selected").text()
                    }
                    if (!selectedWellbore._id) {
                        window.alert("Please select a wellbore")
                        return;
                    };
                    let calculateTVDchecked = $("#dialog-wellbore-properties-edit-survey-data-calculate-tvd-checkbox").prop("checked");
                    gridSurveyWellboreProperties.calcTVD = calculateTVDchecked;
                    const gridData = gridSurveyWellboreProperties.getFormattedData();
                    console.log(gridData);
                    if(gridData.ok!==true) {
                        console.log(gridData.message);
                        return;
                    }
                    const surveyData = {
                        md: gridData.data[0],
                        inclination: gridData.data[2],
                        azimuth: gridData.data[3]
                    }
                    if (calculateTVDchecked) {
                        const tvd = calculateTVD(gridData.data[0], gridData.data[2]);
                        surveyData["tvd"] = tvd;
                        gridSurveyWellboreProperties.render(surveyData);
                    } else {
                        surveyData["tvd"] = gridData.data[1];
                    }
                    try {
                        const activeProject = getLocalActiveProject();
                        const projectId = activeProject._id;
                
                        const formData = {
                            project_id: projectId,
                            well_id: $("#dialog-properties-wellbore-well-select").val(),
                            name: $("#dialog-properties-wellbore-name").val(),
                            description: $("#dialog-properties-wellbore-description").val(),
                            uid: $("#dialog-properties-wellbore-uid").val(),
                            operator: $("#dialog-properties-wellbore-operator").val(),
                            analyst: $("#dialog-properties-wellbore-analyst").val(),
                            status: $("#dialog-properties-wellbore-status-select").val(),
                            purpose: $("#dialog-properties-wellbore-purpose-select").val(),
                            analysis_type: $("#dialog-properties-wellbore-analysis-type-select").val(),
                            trajectory_shape: $("#dialog-properties-wellbore-trajectory-shape-select").val(),
                            rig_name: $("#dialog-properties-wellbore-rig-name").val(),
                            objective_information: $("#dialog-properties-wellbore-objective-information").val(),
                            air_gap: parseFloat($("#dialog-properties-wellbore-air-gap").val()),
                            total_md: parseFloat($("#dialog-properties-wellbore-total-md").val()),
                            total_tvd: parseFloat($("#dialog-properties-wellbore-total-tvd").val()),
                            spud_date: $("#dialog-properties-wellbore-spud-date").val(),
                            completion_date: $("#dialog-properties-wellbore-completion-date").val(),
                            notes: $("#dialog-properties-wellbore-notes").val(),
                            survey: surveyData
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
                
                        console.log("Updating a wellbore:", formData);

                        const result = await updateWellboreProperties(selectedWellbore._id, formData);
                        if (result.success) {
                            initializeTree();
                        } else {
                            throw new Error(response.data.message || "Failed to update wellbore");
                        }
                        
                    } catch (error) {
                        console.error("Error:", error);
                        alert("An error occurred: " + error.message);
                    }
                }
            },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close")
                }
            }
        },
        open: async ()=> {
            $('#dialog-properties-wellbore-tabs').tabs({ active: 0 });
            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const wellSelect = $("#dialog-properties-wellbore-well-select");
            const wellboreSelect = $("#dialog-properties-wellbore-wellbore-select");
            gridSurveyWellboreProperties.render(surveyData=null);

            try {
                await fetchWellsWellboresToSelect(projectId, wellSelect, wellboreSelect);
                wellboreSelect.off('change').on('change', async function () {
                    const selectedWellboreId = $(this).val();
                    const result = await getWellboreProperties(selectedWellboreId, mode="full");
                    const wellboreSurvey = await getWellboreSurvey(selectedWellboreId);
                    if (result.success && wellboreSurvey.success ) {
                        console.log(result.wellbore_properties);

                        // tab general
                        $('#dialog-properties-wellbore-name').val(result.wellbore_properties.name);
                        $('#dialog-properties-wellbore-description').val(result.wellbore_properties.description);
                        $('#dialog-properties-wellbore-uid').val(result.wellbore_properties.uid);
                        $('#dialog-properties-wellbore-operator').val(result.wellbore_properties.operator);
                        $('#dialog-properties-wellbore-analyst').val(result.wellbore_properties.analyst);
                        $('#dialog-properties-wellbore-status-select').val(result.wellbore_properties.status);
                        $('#dialog-properties-wellbore-purpose-select').val(result.wellbore_properties.purpose);
                        $('#dialog-properties-wellbore-analysis-type-select').val(result.wellbore_properties.analysis_type);
                        $('#dialog-properties-wellbore-trajectory-shape-select').val(result.wellbore_properties.trajectory_shape);
                        $('#dialog-properties-wellbore-rig-name').val(result.wellbore_properties.rig_name);
                        $('#dialog-properties-wellbore-objective-information').val(result.wellbore_properties.objective_information);
                        $('#dialog-properties-wellbore-air-gap').val(result.wellbore_properties.air_gap);
                        $('#dialog-properties-wellbore-total-md').val(result.wellbore_properties.total_md);
                        $('#dialog-properties-wellbore-total-tvd').val(result.wellbore_properties.total_tvd);
                        $('#dialog-properties-wellbore-spud-date').val(result.wellbore_properties.spud_date);
                        $('#dialog-properties-wellbore-completion-date').val(result.wellbore_properties.completion_date);

                        $("#dialog-properties-wellbore-notes").val(result.wellbore_properties.notes);
                        gridSurveyWellboreProperties.render(wellboreSurvey.survey);

                        // tab location
                        $("#dialog-properties-wellbore-tabs").tabs({
                            activate: function (event, ui) {
                                handleTabActivation(ui.newPanel.attr("id"));
                            },
                        });
                        
                        const activeTabId = $("#dialog-properties-wellbore-tabs .ui-tabs-active").attr("aria-controls");
                        handleTabActivation(activeTabId);
                        
                        function handleTabActivation(tabId) {
                            if (tabId === "dialog-properties-wellbore-tabs-3") {
                                propertiesWellboreDatasetTable.render(result.wellbore_properties.datasets_properties);
                            };

                            if (tabId === "dialog-properties-wellbore-tabs-2" ) {
                                gridSurveyWellboreProperties.render(wellboreSurvey.survey);
                            };
                        }
                    };
                });
            } catch (error) {
                console.error("Error fetch wellbores:", error);
            };

        },
        close: function () {
            $('#dialog-properties-wellbore-well-select').empty();
            $('#dialog-properties-wellbore-wellbore-select').empty();
            $('#dialog-wellbore-properties-edit-survey-data-calculate-tvd-checkbox').prop('checked', false);
        }
    });

    // DATASET
    // GRID DATASET
    var gridDatasetCreate = new gridTableDataset("dialog-create-dataset-data-grid");
    
    let dialogDatasetCreateCurrentPage = 1;
    const dialogDatasetCreatetotalPages = 3;

    function dialogDatasetCreateShowPage(page) {
        $(".page-dialog-create-dataset").hide();
        $(`.page-dialog-create-dataset[data-page="${page}"]`).show();

        // Dynamically update the dialog title with the current step
        const stepTitles = {
            1: "Step 1: Specify Target",
            2: "Step 2: Collect Dataset Information",
            3: "Step 3: Input Data",
        };
        $("#dialog-create-dataset").dialog("option", "title", stepTitles[page]);
        dialogDatasetCreateUpdateButtonStates();
    }

    function dialogDatasetCreateUpdateButtonStates() {
        $(".ui-dialog-buttonpane button:contains('< Back')").button("option", "disabled", dialogDatasetCreateCurrentPage === 1);
        $(".ui-dialog-buttonpane button:contains('Next >')").button("option", "disabled", dialogDatasetCreateCurrentPage === dialogDatasetCreatetotalPages);
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogDatasetCreateCurrentPage < dialogDatasetCreatetotalPages);
    }
    // DIALOG CREATE DATASET
    $("#dialog-create-dataset").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            "< Back": function () {
                if (dialogDatasetCreateCurrentPage > 1) {
                    dialogDatasetCreateCurrentPage--;
                    dialogDatasetCreateShowPage(dialogDatasetCreateCurrentPage);
                }
            },
            "Next >": function () {
                if (dialogDatasetCreateCurrentPage < dialogDatasetCreatetotalPages) {
                    dialogDatasetCreateCurrentPage++;
                    dialogDatasetCreateShowPage(dialogDatasetCreateCurrentPage);
                }
                if (dialogDatasetCreateCurrentPage === dialogDatasetCreatetotalPages) {
                    $("#dialog-create-dataset-review-well").val($("#dialog-create-dataset-well-select option:selected").text());
                    $("#dialog-create-dataset-review-wellbore").val($("#dialog-create-dataset-wellbore-select option:selected").text());
                    $("#dialog-create-dataset-review-name").val($("#dialog-create-dataset-name").val());
                    $("#dialog-create-dataset-review-index-type").val($("#dialog-create-dataset-index-type-select").val());
                    $("#dialog-create-dataset-review-reference-level").val($("#dialog-create-dataset-reference-level-select").val());
                    $("#dialog-create-dataset-review-data-type").val($("#dialog-create-dataset-data-type-select").val());
                    $("#dialog-create-dataset-review-data-unit").val($("#dialog-create-dataset-data-unit-select").val());
                    
                    const hasTextColumnChecked = $('#dialog-create-dataset-has-text-column-checkbox').prop('checked');
                    gridDatasetCreate.render(dataset=null, hasTextColumn=hasTextColumnChecked);
                };
            },
            Finish: {
                text: "Finish",
                async click() {
                    const hasTextColumnChecked = $('#dialog-create-dataset-has-text-column-checkbox').prop('checked');
                    const gridData = gridDatasetCreate.getFormattedData();
                    if(!gridData.ok) {
                        console.error(gridData.message);
                        return;
                    }
                    var datasetGridData = { index: gridData.data[0], value: gridData.data[1] };
                    if (hasTextColumnChecked) { datasetGridData.description = gridData.data[2]; };

                    // Collect form data
                    const formData = {
                        wellbore_id: $("#dialog-create-dataset-wellbore-select").val(),
                        method: "from scratch",
                        name: $("#dialog-create-dataset-name").val(),
                        description: $("#dialog-create-dataset-description").val(),
                        index_type: $("#dialog-create-dataset-index-type-select").val(),
                        index_unit: $("#dialog-create-dataset-index-unit-select").val(),
                        reference_level: $("#dialog-create-dataset-reference-level-select").val(),
                        reference_date: $("#dialog-create-dataset-reference-date").val(),
                        data_type: $("#dialog-create-dataset-data-type-select").val(),
                        data_unit: $("#dialog-create-dataset-data-unit-select").val(),
                        color: $("#dialog-create-dataset-color-select").val(),
                        line_style: $("#dialog-create-dataset-line-style-select").val(),
                        line_width: parseInt($("#dialog-create-dataset-line-width-select").val()),
                        symbol: $("#dialog-create-dataset-symbol-select").val(),
                        symbol_size: parseInt($("#dialog-create-dataset-symbol-size-select").val()),
                        has_text_column: hasTextColumnChecked,
                        data: datasetGridData,
                        date_created: new Date().toISOString()
                    };
                
                    // Validate required fields
                    const requiredFields = ["wellbore_id", "name", "index_type", "index_unit", "data_type", "data_unit"];
                    const missingFields = requiredFields.filter(field => !formData[field]);
                    if (missingFields.length > 0) {
                        alert(`Please fill in the following fields: ${missingFields.join(", ")}`);
                        return;
                    }
                
                    console.log("Creating a new dataset:", formData);
                
                    try {
                        const result = await addDataset(formData);
                        if (result && result.success) {
                            console.log("Dataset created successfully:", result);
                            $("#dialog-create-dataset").dialog("close");
                            initializeTree();
                        } else {
                            throw new Error(result ? result.message : "Unknown error occurred");
                        }
                    } catch (error) {
                        console.error("Error creating dataset:", error);
                        alert("An error occurred while creating the dataset: " + error.message);
                    }

                }
            },
            
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        open: async ()=> {
            dialogDatasetCreateCurrentPage=1;
            dialogDatasetCreateShowPage(dialogDatasetCreateCurrentPage);

            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const wellSelect = $('#dialog-create-dataset-well-select');
            const wellboreSelect = $('#dialog-create-dataset-wellbore-select');
            fetchWellsWellboresToSelect(projectId, wellSelect, wellboreSelect);
            const dataTypeSelect = $("#dialog-create-dataset-data-type-select");
            const dataUnitSelect = $("#dialog-create-dataset-data-unit-select");

            wellSelect.off('change').on('change', async function () {
                console.log("well changed");
                try {
                    const response  = await getWellProperties(wellSelect.val(), mode="basic");
                    if (response.success) {
                        $("#dialog-create-dataset-index-unit-select").val(response.well_properties.default_unit_depth);
                    };
                } catch (error) {
                    console.error("Failed to fetch well properties:", error);
                }
            });
            wellboreSelect.off('change').on('change', async function () {
                try {
                    const response  = await getWellboreProperties(wellboreSelect.val(), mode="basic");
                    if (response.success) {
                        $("#dialog-create-dataset-reference-date").val(response.wellbore_properties.spud_date);
                    };
                } catch (error) {
                    console.error("Failed to fetch wellbore properties:", error);
                }
            });

            createDatasetHandleDatasetInput(
                "#dialog-create-dataset-name",
                "#dialog-create-dataset-data-type-select",
                "#dialog-create-dataset-data-unit-select",
                "#dialog-create-dataset-color-select",
                "#dialog-create-dataset-line-style-select",
                "#dialog-create-dataset-line-width-select",
                "#dialog-create-dataset-symbol-select",
                "#dialog-create-dataset-symbol-size-select"
            );
            
        },
        close: () => {
            $("#dialog-form-create-dataset")[0].reset();
            $('#dialog-create-dataset-well-select').empty();
            $('#dialog-create-dataset-wellbore-select').empty();
        }
    });

    // DIALOG DELETE DATASET
    $("#dialog-delete-dataset").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
        buttons: {
            Delete: {
                text: "Delete",
                async click() {
                    // const wellSelect = $("#dialog-delete-dataset-well-select");
                    const wellboreSelect = $("#dialog-delete-dataset-wellbore-select");
                    const datasetSelect = $("#dialog-delete-dataset-dataset-select");
                    var selectedDatasets = {
                        _ids: datasetSelect.val(),
                        names: datasetSelect.find("option:selected").toArray().map(item => item.text)
                    }
                    console.log(selectedDatasets);
                    if (selectedDatasets._ids.length===0) {
                        window.alert("Please select dataset(s)!");
                        return;

                    }
                    const isConfirmed = window.confirm(`Are you sure you want to delete the dataset?`);
                    if (isConfirmed) {
                        try {
                            const result = await deleteDatasets(wellboreSelect.val(), selectedDatasets._ids);
                            console.log("Response:", result);
                
                            if (result.success) {
                                fetchDatasetsToSelect(wellboreSelect.val(), datasetSelect);
                                selectedDatasets = {};
                                initializeTree();
                            }
                        } catch (error) {
                            console.error("Failed to delete dataset:", error.message);
                        }
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
            try {
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-delete-dataset-well-select');
                const wellboreSelect = $('#dialog-delete-dataset-wellbore-select');
                const datasetSelect = $('#dialog-delete-dataset-dataset-select');
                await fetchWellsWellboresDatasetsToSelect(projectId, wellSelect, wellboreSelect, datasetSelect);
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
        },
        close: function () {
            $('#dialog-delete-dataset-well-select').empty();
            $('#dialog-delete-dataset-wellbore-select').empty();
            $('#dialog-delete-dataset-dataset-select').empty();
        }
    });

    // PROPERTIES DATASET
    let datasetPropertiesDataHasTextColumn = false;
    // let datasetPropertiesDataGrid;

    var gridDatasetProperties = new gridTableDataset("dialog-properties-dataset-data-grid");

    // DIALOG PROPERTIES DATASET
    $("#dialog-properties-dataset").dialog({
        autoOpen: false,
        height: 400,
        width: 650,
        modal: true,
        buttons: {
            Delete: {
                text: "Delete selected dataset",
                async click() {
                    // const wellSelect = $("#dialog-delete-dataset-well-select");
                    const wellboreSelect = $("#dialog-properties-dataset-wellbore-select");
                    const datasetSelect = $("#dialog-properties-dataset-dataset-select");
                    var selectedDatasets = {
                        _ids: datasetSelect.val(),
                        names: datasetSelect.find("option:selected").text()
                    }
                    if (!selectedDatasets._ids) {
                        window.alert("Please select dataset!");
                        return;
                    }
                    const isConfirmed = window.confirm(`Are you sure you want to delete the dataset?`);
                    if (isConfirmed) {
                        try {
                            const result = await deleteDatasets(wellboreSelect.val(), [selectedDatasets._ids]);
                            console.log("Response:", result);
                
                            if (result.success) {
                                fetchDatasetsToSelect(wellboreSelect.val(), datasetSelect);
                                selectedDatasets = {};
                                initializeTree();
                            }
                        } catch (error) {
                            console.error("Failed to delete dataset:", error.message);
                        }
                    }
                }
            },
            SaveAs: {
                text: "Save As...",
                async click() {
                    console.log("Save as dataset");
                }
            },
            Apply: {
                text: "Apply",
                async click() {
                    const datasetId = $('#dialog-properties-dataset-dataset-select').val();
                    if (!datasetId) {
                        alert("Select a dataset!");
                    };
                    const gridData = gridDatasetProperties.getFormattedData();
                    if(!gridData.ok) {
                        console.error(gridData.message);
                        return;
                    }         
                    let datasetGridData = { index: gridData.data[0], value: gridData.data[1] };
                    if (datasetPropertiesDataHasTextColumn) {
                        datasetGridData.description = gridData.data[2];
                    }

                    const formData = {
                        name: $("#dialog-properties-dataset-name").val(),
                        description: $("#dialog-properties-dataset-description").val(),
                        index_type: $("#dialog-properties-dataset-advanced-index-type-select").val(),
                        index_unit: $("#dialog-properties-dataset-advanced-index-unit-select").val(),
                        reference_level: $("#dialog-properties-dataset-advanced-reference-level-select").val(),
                        // reference_date: $("#dialog-properties-dataset-reference-date").val(),
                        data_type: $("#dialog-properties-dataset-advanced-data-type-select").val(),
                        data_unit: $("#dialog-properties-dataset-advanced-data-unit-select").val(),
                        data: datasetGridData,
                        date_updated: new Date().toISOString()
                    };
                
                    // Validate required fields
                    const requiredFields = ["name", "index_type", "index_unit", "data_type", "data_unit"];
                    const missingFields = requiredFields.filter(field => !formData[field]);
                    if (missingFields.length > 0) {
                        alert(`Please fill in the following fields: ${missingFields.join(", ")}`);
                        return;
                    }
                    console.log("Updating a dataset:", formData);
                    try {
                        const response = await updateDatasetProperties(datasetId, formData);
                        if (response.success) {
                            const wellboreSelect = $("#dialog-properties-dataset-wellbore-select");
                            const datasetSelect = $("#dialog-properties-dataset-dataset-select");
                            fetchDatasetsToSelect(wellboreSelect.val(), datasetSelect);
                            initializeTree();
                        } else {
                            throw new Error(response.message || "Failed to update dataset");
                        }
                    } catch (error) {
                        console.error("Error:", error);
                        alert(error.message);  // Display the error message to the user
                    }
                }
            },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close")
                }
            }
        },
        open: async ()=> {
            $('#dialog-properties-dataset-tabs').tabs({ active: 0 });
            try {
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-properties-dataset-well-select');
                const wellboreSelect = $('#dialog-properties-dataset-wellbore-select');
                const datasetSelect = $('#dialog-properties-dataset-dataset-select');
                await fetchWellsWellboresDatasetsToSelect(projectId, wellSelect, wellboreSelect, datasetSelect);

                datasetSelect.off('change').on('change', async function () {
                    const selectedDatasetId = $(this).val();
                    try {
                        const result = await getDatasetProperties(selectedDatasetId);
                        if (result.success) {
                            console.log(result.dataset_properties);
                            $('#dialog-properties-dataset-name').val(result.dataset_properties.name);
                            $('#dialog-properties-dataset-description').val(result.dataset_properties.description);
                            $('#dialog-properties-dataset-data-type').val(result.dataset_properties.data_type);
                            $('#dialog-properties-dataset-data-unit').val(result.dataset_properties.data_unit);
                            $('#dialog-properties-dataset-index-type').val(result.dataset_properties.index_type);
                            $('#dialog-properties-dataset-index-unit').val(result.dataset_properties.index_unit);
                            $('#dialog-properties-dataset-reference-level').val(result.dataset_properties.reference_level);
                            $('#dialog-properties-dataset-reference-date').val(result.dataset_properties.reference_date);

                            gridDatasetProperties.render(result.dataset_properties.data, result.dataset_properties.has_text_column);
                            datasetPropertiesDataHasTextColumn = result.dataset_properties.has_text_column;

                            $("#dialog-properties-dataset-tabs").tabs({
                                activate: function (event, ui) {
                                    const activeTabId = ui.newPanel.attr("id"); // Get the ID of the activated tab
                                    if (activeTabId==="dialog-properties-dataset-tabs-2") {
                                        if (datasetSelect.val()) {
                                            gridDatasetProperties.render(result.dataset_properties.data, result.dataset_properties.has_text_column);
                                        } else {
                                            gridDatasetProperties.render(dataset=null, result.dataset_properties.has_text_column);

                                        }
                                    };
                                },
                            });
                            
                            // set tab parameters
                            // const parametersText = `Method: ${result.dataset_properties.method}\nDataset name: ${result.dataset_properties.name}\nDate created: ${result.dataset_properties.dateCreated}\nMin value: ${Math.min(...result.dataset_properties.data.value)}\nMax value: ${Math.max(...result.dataset_properties.data.value)}`;
                            const parametersText = datasetPropertiesToParametersText(result.dataset_properties);
                            $("#dialog-properties-dataset-parameters-textarea").val(parametersText);

                            
                            // set tab advanced
                            const dataTypeSelect = $("#dialog-properties-dataset-advanced-data-type-select");
                            const dataUnitSelect = $("#dialog-properties-dataset-advanced-data-unit-select");
                            addDataTypeDataUnitOptions(dataTypeSelect, dataUnitSelect, result.dataset_properties.data_type, result.dataset_properties.data_unit)
                            $('#dialog-properties-dataset-advanced-index-type-select').val(result.dataset_properties.index_type);
                            $('#dialog-properties-dataset-advanced-index-unit-select').val(result.dataset_properties.index_unit);
                            $('#dialog-properties-dataset-advanced-reference-level-select').val(result.dataset_properties.reference_level);
                        };
                    } catch(error) {
                        console.error("Error get datasets:", error);
                    };
                });

            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
        },
        close: function () {
            $('#dialog-properties-dataset-well-select').empty();
            $('#dialog-properties-dataset-wellbore-select').empty();
            $('#dialog-properties-dataset-dataset-select').empty();
        }
    });

    //////// TOOL ////////
    const unitGroupSelect = $("#dialog-tool-datatype-unit-group-select");
    const selectedDatatypeNameEl =  $("#dialog-tool-datatype-name");
    const selectedDatatypeDescriptionEl =  $("#dialog-tool-datatype-description");
    const selectedDatatypeDisplayEl =  $("#dialog-tool-datatype-display-attributes");

    const toolDatatypeDataTable = new DatatypeDataTable('#dialog-tool-data-type-table', { ordering: true ,}, 
        unitGroupSelect, selectedDatatypeNameEl, selectedDatatypeDescriptionEl, selectedDatatypeDisplayEl
    );

    $("#dialog-tool-datatype").dialog({
        autoOpen: false,
        height: 400,
        width: 700,
        modal: true,
        buttons: {
            // Add: {
            //     text: "Add New",
            //     async click() {
            //     }
            // },
            Update: {
                text: "Update",
                async click() {
                    const user = getLocalUser();
                    const selectedDatatype = toolDatatypeDataTable.getSelectedRows();
                    try {   
                        const updateData = {
                            description: selectedDatatypeDescriptionEl.val(),
                            unit_group: unitGroupSelect.val()
                        };
                        console.log(updateData);
                        const response = await updateDataType(user._id, selectedDatatype.name, updateData);
                        if (response.success) {
                            console.log(response.message);
                            await initConfig();
                            toolDatatypeDataTable.render(window.userDataConfig.data_types);
                            // $(this).dialog("close");
                        };
                    } catch (error) {
                        console.error(error.message);
                    }
                }
            },
            // Delete: {
            //     text: "Delete",
            //     async click() {
            //     }
            // },
            Cancel: {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        },
        open: async ()=> {
            try {
                console.log('open');
                fetchUnitGroupSelect(unitGroupSelect);
                toolDatatypeDataTable.render(window.userDataConfig.data_types);

                // $("#dialog-tool-data-type-table").off('click').on('click', 'tr', function() {
                //     console.log("clicked tr");
                // });
        
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
            
        },
        close: function () {
            // $('#dialog-delete-wellbore-select').empty()
            //pass
        }
    });

    // DATATYPE ATTRIBUTES
    const datatypeAttributeColorSelect = $("#dialog-tool-datatype-attributes-color-select");
    const datatypeAttributeLineStyleSelect = $("#dialog-tool-datatype-attributes-line-style-select");
    const datatypeAttributeLineWidthSelect = $("#dialog-tool-datatype-attributes-line-width-select");
    const datatypeAttributeSymbolSelect = $("#dialog-tool-datatype-attributes-symbol-select");
    const datatypeAttributeSymbolSizeSelect = $("#dialog-tool-datatype-attributes-symbol-size-select");

    $("#dialog-tool-datatype-attributes").dialog({
        autoOpen: false,
        height: 200,
        width: 335,
        modal: true,
        buttons: {
            OK: {
                text: "OK",
                async click() {
                    const user = getLocalUser();
                    const selectedDatatypes = toolDatatypeDataTable.getSelectedRows();

                    try {   
                        const updateData = {
                            "display_attributes": {
                                "color": datatypeAttributeColorSelect.val(),
                                "line_style": datatypeAttributeLineStyleSelect.val(),
                                "line_width": parseInt(datatypeAttributeLineWidthSelect.val()),
                                "symbol": datatypeAttributeSymbolSelect.val(),
                                "symbol_size": parseInt(datatypeAttributeSymbolSizeSelect.val())
                            }
                        };

                        const response = await updateDataType(user._id, selectedDatatypes.name, updateData);
                        if (response.success) {
                            console.log(response.message);
                            await initConfig();
                            toolDatatypeDataTable.render(window.userDataConfig.data_types);

                            $(this).dialog("close");
                        };
                    } catch (error) {
                        console.error(error.message);
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
            console.log(toolDatatypeDataTable.getSelectedRows());
            const selectedDatatypeAttribute = toolDatatypeDataTable.getSelectedRows().display_attributes;

            try {
                datatypeAttributeColorSelect.val(selectedDatatypeAttribute.color);
                datatypeAttributeLineStyleSelect.val(selectedDatatypeAttribute.line_style);
                datatypeAttributeLineWidthSelect.val(selectedDatatypeAttribute.line_width);
                datatypeAttributeSymbolSelect.val(selectedDatatypeAttribute.symbol);
                datatypeAttributeSymbolSizeSelect.val(selectedDatatypeAttribute.symbol_size);
        
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
            
        },
        close: function () {
            // $('#dialog-delete-wellbore-select').empty()
            //pass
        }
    });

    // UNIT GROUP
    const unitGroupTable = new TreeTable("dialog-tool-unit-group-tree-table");
    $("#dialog-tool-unit-group").dialog({
        autoOpen: false,
        height: 400,
        width: 700,
        modal: true,
        buttons: {
            AddGroup: {
                text: "Add Group",
                async click() {
                    $("#dialog-tool-unit-group-add-group").dialog("open");
                }
            },
            AddUnit: {
                text: "Add Unit",
                async click() {
                    $("#dialog-tool-unit-group-add-unit").dialog("open");
                }
            },
            Update: {
                text: "Update",
                async click() {
                    console.log(unitGroupTable.getSelectedRow());

                }
            },
            Delete: {
                text: "Delete",
                async click() {
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
            // const data = window.userDataConfig.un
            try {
                console.log('open');
                unitGroupTable.renderTable(window.userDataConfig.unit_groups);
        
            } catch (error) {
                console.error("Failed to fetch wells:", error.message);
            }
            
        },
        close: function () {

        }
    });


    // UNIT GROUP: ADD NEW GROUP
    $("#dialog-tool-unit-group-add-group").dialog({
        autoOpen: false,
        height: 200,
        width: 335,
        modal: true,
        buttons: {
            OK: {
                text: "OK",
                async click() {
                    const user = getLocalUser();
                    try {   
                        const newUnitGroup = {
                            "unit_group": {
                                "name": $("#dialog-tool-unit-group-add-group-name").val(),
                                "description": $("#dialog-tool-unit-group-add-group-description").val(),
                                "unit": []
                            }
                        };

                        const response = await addUnitGroup(user._id, newUnitGroup);
                        if (response.success) {
                            console.log(response.message);
                            await initConfig();
                            unitGroupTable.renderTable(window.userDataConfig.unit_groups);
                            $(this).dialog("close");
                        };
                    } catch (error) {
                        console.error(error.message);
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

        },
        close: function () {

        }
    });

    // UNIT GROUP: ADD NEW UNIT
    $("#dialog-tool-unit-group-add-unit").dialog({
        autoOpen: false,
        height: 400,
        width: 300,
        modal: true,
        buttons: {
            OK: {
                text: "OK",
                async click() {
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
            let selectedRow = unitGroupTable.getSelectedRow();
            if (selectedRow && selectedRow.groupName) {
                console.log(selectedRow.groupName);
                $("#dialog-tool-unit-group-add-unit-group-name").val(selectedRow.groupName);
            } else {
                console.log("No row selected");
            }
        },
        close: function () {

        }
    });

    // Notes: create API to add data unit


});