$(document).ready(function () {

    // Fetch to select
    const fetchWellsToSelect = async(projectId, wellSelect) => {
        if (projectId) {
            try {
                const wells = await getWells(projectId);
                wellSelect.empty();
                // wellSelect.append(`<option value=""></option>`);
                wells.forEach(well => {
                    wellSelect.append(`<option value="${well._id}">${well.name}</option>`);
                });
            } catch (error) {
                console.error("Error populating wells:", error);
            }
        }
    };

    const fetchWellboresToSelect = async(selectedWellId, wellboreSelect) => {
        if (selectedWellId) {
            try {
                const wellbores = await getWellbores(selectedWellId);
                wellboreSelect.empty();
                // wellboreSelect.append(`<option value=""></option>`);
                wellbores.forEach(wellbore => {
                    wellboreSelect.append(`<option value="${wellbore._id}">${wellbore.name}</option>`);
                });
            } catch (error) {
                console.error("Error populating wellbores:", error);
            }
        }
    };

    const fetchDatasetsToSelect = async(selectedWellboreId, datasetSelect) => {
        if (selectedWellboreId) {
            try {
                const datasets = await getDatasets(selectedWellboreId);
                datasetSelect.empty();
                datasets.forEach(dataset => {
                    datasetSelect.append(`<option value="${dataset._id}">${dataset.name}</option>`);
                });
            } catch (error) {
                console.error("Error populating datasets:", error);
            }
        }
    };

    const fetchWellsWellboresToSelect = async(projectId, wellSelect, wellboreSelect) => {
        fetchWellsToSelect(projectId, wellSelect);
        wellSelect.off('change').on('change', async function () {
            const selectedWellId = $(this).val();
            fetchWellboresToSelect(selectedWellId, wellboreSelect);
        });
    };

    const fetchWellsWellboresDatasetsToSelect = async(projectId, wellSelect, wellboreSelect, datasetSelect) => {
        fetchWellsToSelect(projectId, wellSelect);

        wellSelect.off('change').on('change', async function () {
            const selectedWellId = $(this).val();
            fetchWellboresToSelect(selectedWellId, wellboreSelect);
            datasetSelect.empty();
        });
        wellboreSelect.off('change').on('change', async function () {
            const selectedWellboreId = $(this).val();
            fetchDatasetsToSelect(selectedWellboreId, datasetSelect);
        });
    };


    function col_to_row(...columns) {
        let result = [];
        
        // Get the length of the first column to loop through
        const numRows = columns[0].length;
        
        // Loop through each row
        for (let i = 0; i < numRows; i++) {
            let row = [];
            
            // For each column, push the corresponding value at index 'i' into the row
            for (let j = 0; j < columns.length; j++) {
                row.push(columns[j][i]);
            }
            // Add the row to the result
            result.push(row);
        }
    
        return result;
    }

    function transposeAndConvert(array, skipColumn, skipColumnIndex=null) {
        const nEmptyRow = 10;
        const emptyArray = Array.from({ length: array[0].length }, () => Array(nEmptyRow).fill(null));
    
        // If the array is empty or contains only null values, return a 2D null array with 5 columns and n rows
        if (array.length === 0 || array.every(row => row.every(cell => cell === null))) {
            return {
                ok: true,
                message: 'ok',
                data: emptyArray
            };
        }
    
        // Check for mixed null and number in each row (skip specified column if skipColumn is true)
        for (let rowIndex = 0; rowIndex < array.length; rowIndex++) {
            let hasNumber = false;
            let hasNull = false;
    
            for (let colIndex = 0; colIndex < array[rowIndex].length; colIndex++) {
                if (skipColumn && colIndex === skipColumnIndex) {
                    continue; // Skip the specified column if skipColumn is true
                }
                let cell = array[rowIndex][colIndex];
                if (cell === null) {
                    hasNull = true;
                } else if (!isNaN(cell)) {
                    hasNumber = true;
                }
            }
    
            if (hasNumber && hasNull) {
                alert(`Error at row ${rowIndex + 1}: Row contains both numbers and null values.`);
                return {
                    ok: false,
                    message: `Error at row ${rowIndex + 1}: Row contains both numbers and null values.`,
                    data: emptyArray
                };
            }
        }
    
        // Filter out rows that only contain null values
        let filteredArray = array.filter(row => row.some(cell => cell !== null));
    
        // Check if the rows are continuous (i.e., no null rows between non-null rows)
        let nullRowDetected = false;
        for (let i = 0; i < array.length; i++) {
            if (array[i].every(cell => cell === null)) {
                if (!nullRowDetected) {
                    nullRowDetected = true;
                }
            } else if (nullRowDetected) {
                alert(`Error: Found gap between filled rows at row ${i + 1}.`);
                return {
                    ok: false,
                    message: `Error: Found gap between filled rows at row ${i + 1}.`,
                    data: emptyArray
                };
            }
        }
    
        // Transpose the filtered array (convert rows to columns)
        let transposed = filteredArray[0].map((_, colIndex) => filteredArray.map(row => row[colIndex]));
    
        // Convert all values to float and check for invalid values (skip specified column if skipColumn is true)
        for (let rowIndex = 0; rowIndex < transposed.length; rowIndex++) {
            // Skip the specified column index if skipColumn is true
            if (skipColumn && rowIndex === skipColumnIndex) {
                continue; // Skip the conversion and validation for the specified column
            }
    
            for (let colIndex = 0; colIndex < transposed[rowIndex].length; colIndex++) {
                let cell = transposed[rowIndex][colIndex];
    
                if (cell === null) {
                    alert(`Null value found at row ${rowIndex + 1}, column ${colIndex + 1}`);
                    return {
                        ok: false,
                        message: `Null value found at row ${rowIndex + 1}, column ${colIndex + 1}`,
                        data: emptyArray
                    };
                }
    
                let floatValue = parseFloat(cell);
                if (isNaN(floatValue)) {
                    alert(`Invalid value found at row ${rowIndex + 1}, column ${colIndex + 1}`);
                    return {
                        ok: false,
                        message: `Invalid value found at row ${rowIndex + 1}, column ${colIndex + 1}`,
                        data: emptyArray
                    };
                }
                transposed[rowIndex][colIndex] = floatValue;
            }
        }
        return {
            ok: true,
            message: 'ok',
            data: transposed
        };
    }
             
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
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", currentPage < totalPages-1);
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
                    default_depth_unit: $('input[name="dialog-create-project-default-depth-unit"]:checked').val(),
                    notes: $("#dialog-create-project-notes").val(),
                    date_created: new Date()
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
                        initializeTree();
                    } else {
                        throw new Error(response.message || "Failed to add project");
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
            console.log(openProjectTableSelectedProject._id);
        }
        
    });

    // DIALOG OPEN PROJECT
    $("#dialog-open-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
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
                                initializeTree();
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
    });

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
                    const dialog = $(this);
                    if (deleteProjectTableSelectedProject) {
                        const isConfirmed = window.confirm(`Are you sure you want to delete the project: ${deleteProjectTableSelectedProject.name}?`);
                        if (isConfirmed) {
                            var deleteWellsChecked = $("#dialog-delete-project-delete-wells-checkbox").prop("checked");
                            try {
                                const response = await deleteProject(deleteProjectTableSelectedProject, deleteWellsChecked);
                                console.log("Response:", response);
                    
                                if (response.success) {
                                    // alert("Project deleted successfully!");
                                    // dialog.dialog("close");  // Use the stored reference to close the dialog
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

    // DIALOG PROPERTIES PROJECT
    $("#dialog-properties-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
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
            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            try {
                const result = await getProjectProperties(projectId);
                if (result.success) {
                    console.log(result.project);
                    $("#dialog-properties-project-name").val(result.project.name);
                    $("#dialog-properties-project-description").val(result.project.description);
                    $("#dialog-properties-project-analyst").val(result.project.analyst);
                    $("#dialog-properties-project-notes").val(result.project.notes);
                    $("#dialog-properties-project-default-depth-unit-select").val(result.project.defaultDepthUnit).change();
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
        $(".ui-dialog-buttonpane button:contains('Finish')").button("option", "disabled", dialogWellCreateCurrentPage < dialogWellCreatetotalPages-1);
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
                            console.log("Add well: success: ", result);
                            $(this).dialog("close");
                            initializeTree();
                        } else {
                            throw new Error(response.data.message || "Failed to add well");
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
    // DIALOG DELETE WELL
    $("#dialog-delete-well").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
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

        dialogWellboreCreateUpdateButtonStates();

        if (page===2) {
            const wellSelectedName = $("#dialog-create-wellbore-well-select").find("option:selected").text();
            console.log(wellSelectedName);
            
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
                            console.log("add wellbore: success")
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
            console.log("open dialog");
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
                    console.log(selectedWellbore);
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
            console.log("fetch wellbores called");
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

    // WELLBORE TABLE EDIT SURVEY
    let surveyInputGrid;
    function renderGridEditSurvey(surveyData) {
        let data;
        console.log(surveyData.md.length);
        if(surveyData.md.length==0) {
            // const rowData = generateEmptyRows(colData);
            data = DataGridXL.createEmptyData(10, 4)
        } else {
            data = col_to_row(surveyData.md, surveyData.tvd, surveyData.inclination, surveyData.azimuth);
        };

        const headers = [
            { title: "MD", type: 'number', format: '0,0.00' },
            { title: "TVD", type: 'number', format: '0,0.00' },
            { title: "INCLINATION", type: 'number', format: '0,0.00' },
            { title: "AZIMUTH", type: 'number', format: '0,0.00' } ];

        surveyInputGrid = new DataGridXL("dialog-wellbore-edit-survey-data-grid", {
            // data: DataGridXL.createEmptyData(20, 4),
            data: data,
            columns: headers,
            allowDeleteCols: false,
            allowMoveCols: false,
            allowInsertCols: false,
            allowHideCols: false,
            allowHideRows: false,
            allowMoveRows: false,
            colHeaderHeight: 16,
            colHeaderWidth: 30,
            colHeaderLabelType: "numbers",
            colHeaderLabelAlign: "center",
            colAlign: "right",
            rowHeight: 16,
            frozenRows: 0,
            topBar: false,
            bottomBar: false,
        });
    };

    async function renderGridEditSurveyAsync(selectedWellboreId) {
        try {
            const result = await getWellboreSurvey(selectedWellboreId);
            if (result.success) {
                console.log("get survey success ", result.survey)
                renderGridEditSurvey(result.survey);
            } else {
                throw new Error(response.data.message || "Failed to get survey");
            };
        } catch (error) {
            console.error("Error rendering grid:", error);
        }
    }

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
                    let calculateTVDchecked = $("#page-dialog-wellbore-edit-survey-data-calculate-tvd-checkbox").prop("checked");
                    const gridData = transposeAndConvert(surveyInputGrid.getData(), calculateTVDchecked, calculateTVDchecked?1:null);
                    console.log(gridData);

                    if (!selectedWellbore._id) {
                        window.alert("Please select a wellbore")
                        return;
                    };
                    if(gridData.ok===true) {
                        console.log("gridData OK");
                        try {
                            const formData = {
                                md: gridData.data[0],
                                inclination: gridData.data[2],
                                azimuth: gridData.data[3],
                                calculate_tvd_checked: calculateTVDchecked
                            };
                            if (!calculateTVDchecked) {
                                formData.tvd = gridData.data[1];
                            };
                            console.log(formData);
                            const result = await setWellboreSurvey(selectedWellbore._id, formData);
                            if (result.success) {
                                console.log("set survey: success");
                                console.log(result);
                                if (calculateTVDchecked) {
                                    const newSurveyData = {
                                        md: formData.md,
                                        tvd: result.survey.tvd,
                                        inclination: formData.inclination,
                                        azimuth: formData.azimuth,
                                    }
                                    renderGridEditSurvey(newSurveyData);
                                }
                            } else {
                                throw new Error(response.data.message || "Failed to add wellbore");
                            }
                        } catch (error) {
                            console.error("Error:", error);
                            alert("An error occurred: " + error.message);
                        }
                    } else {
                        console.log(gridData.message);
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
            console.log("open dialog edit survey data")
            renderGridEditSurvey({md: []})
            try {
                const activeProject = getLocalActiveProject();
                const projectId = activeProject._id;
                const wellSelect = $('#dialog-wellbore-edit-survey-data-well-select');
                const wellboreSelect = $('#dialog-wellbore-edit-survey-data-wellbore-select');

                // fetchWellsWellboresToSelect(projectId, wellSelect, wellboreSelect);
                // wellboreSelect.off('change').on('change', async function () {
                //     var selectedWellbore = {
                //         _id: wellboreSelect.val(),
                //         name: wellboreSelect.find("option:selected").text()
                //     }
                //     renderGridEditSurveyAsync(selectedWellbore._id);
                // });
                fetchWellsToSelect(projectId, wellSelect);
                let selectedWellId = null;
                let selectedWellboreId = null;
                wellSelect.off('change').on('change', async function () {
                    selectedWellId = $(this).val();
                    fetchWellboresToSelect(selectedWellId, wellboreSelect);
                    selectedWellboreId = null;
                    renderGridEditSurvey({md: []})
                });
                wellboreSelect.off('change').on('change', async function () {
                    console.log("wellbore select changed");
                    selectedWellboreId = $(this).val();
                    renderGridEditSurveyAsync(selectedWellboreId);
                });
        
            } catch (error) {
                console.error("Failed to fetch survey:", error.message);
            }
        },
        close: function () {
            $('#dialog-wellbore-edit-survey-data-well-select').empty();
            $('#dialog-wellbore-edit-survey-data-wellbore-select').empty();
        }
    });


    // DATASET
    function addDatasetDatatypeUnit() {
        // Add event listener for data type selection
        const dataTypeSelect = $("#dialog-create-dataset-data-type-select");
        const unitSelect = $("#dialog-create-dataset-data-unit-select");
    
        // Define mapping between data types and units
        const pressureGradientUnits = ["sg", "ppg", "psi/ft", "g/cc", "kPa/m", "Pa/m", "MPa/m"];
        const dataTypeToUnits = {
            "PP": pressureGradientUnits,
            "FG": pressureGradientUnits,
            "OBG": pressureGradientUnits,
            "Temperature": ["Celsius", "Fahrenheit"],
            "Unknown": ["unknown"],
            "POISSON": ["unitless"],
            "GR": ["GAPI", "API"],
            "RT": ["ohmm"],
            "DT": ["us/ft", "us/m"],
            "RHOB": pressureGradientUnits,
        };
    
        dataTypeSelect.off('change');
        dataTypeSelect.on('change', function () {
            const selectedDataType = $(this).val(); // Get the selected value
            unitSelect.empty(); // Clear previous options
    
            if (dataTypeToUnits[selectedDataType]) {
                dataTypeToUnits[selectedDataType].forEach(unit => {
                    const option = $('<option></option>').val(unit).text(unit);
                    unitSelect.append(option);
                });
            } else {
                const defaultOption = $('<option></option>').val('').text('-');
                unitSelect.append(defaultOption);
            }
            console.log("changed data type select");
        });
    }
    

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
                    renderGridCreateDataset(hasTextColumnChecked);
                }
            },
            Finish: {
                text: "Finish",
                async click() {
                    const hasTextColumnChecked = $('#dialog-create-dataset-has-text-column-checkbox').prop('checked');
                    const gridData = transposeAndConvert(
                        datasetInputGrid.getData(),
                        hasTextColumnChecked,
                        hasTextColumnChecked ? 2 : null
                    );                
                    let datasetGridData = { index: gridData.data[0], value: gridData.data[1] };
                    if (hasTextColumnChecked) {
                        datasetGridData.description = gridData.data[2];
                    }
                    // Collect form data
                    const formData = {
                        wellbore_id: $("#dialog-create-dataset-wellbore-select").val(),
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
        open: ()=> {
            console.log("open dialog");
            dialogDatasetCreateCurrentPage=1;
            dialogDatasetCreateShowPage(dialogDatasetCreateCurrentPage);

            const activeProject = getLocalActiveProject();
            const projectId = activeProject._id;
            const wellSelect = $('#dialog-create-dataset-well-select');
            const wellboreSelect = $('#dialog-create-dataset-wellbore-select');
            fetchWellsWellboresToSelect(projectId, wellSelect, wellboreSelect);
            addDatasetDatatypeUnit();
        },
        close: () => {
            $("#dialog-form-create-dataset")[0].reset();
            $('#dialog-create-dataset-well-select').empty();
            $('#dialog-create-dataset-wellbore-select').empty();
        }
    });

    let datasetInputGrid;
    function renderGridCreateDataset(hasTextColumn) {

        // data = col_to_row(surveyData.md, surveyData.tvd, surveyData.inclination, surveyData.azimuth);
        headers = [
            { title: "INDEX", type: 'number', format: '0,0.00' },
            { title: "VALUE", type: 'number', format: '0,0.00' } ];
        if (hasTextColumn) { headers.push( { title: "DESCRIPTION", type: 'text', format: '0,0.00' }) };
        
        datasetInputGrid = new DataGridXL("dialog-create-dataset-data-grid", {
            data: DataGridXL.createEmptyData(20, 3),
            // data: data,
            columns: headers,
            allowDeleteCols: false,
            allowMoveCols: false,
            allowInsertCols: false,
            allowHideCols: false,
            allowHideRows: false,
            allowMoveRows: false,
            colHeaderHeight: 16,
            colHeaderWidth: 30,
            colHeaderLabelType: "numbers",
            colHeaderLabelAlign: "center",
            colAlign: "right",
            rowHeight: 16,
            frozenRows: 0,
            topBar: false,
            bottomBar: false,
        });
    };

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
                    if (selectedDatasets._ids) {
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
                    } else {
                        window.alert("Please select dataset(s)!")
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


    // DATASET PROPERTIES
    // const fetchDatasetProperties = async(datasetSelect) => {
    //     datasetSelect.off('change').on('change', async function () {
    //         const selectedDatasetId = $(this).val();
    //         try {
    //             const result = await getDatasetProperties(datasetId);
    
    //             if (result.success) {
    //                 console.log(result.dataset);
    //             };
    //         } catch(error) {
    //             console.error("Error get datasets:", error);
    //         };
    //     });
    // };

    let datasetPropertiesDataGrid;
    function renderGridDatasetPropertiesData(hasTextColumn=false, datasetData, empty=false) {
        let data, cols;
        headers = [
            { title: "INDEX", type: 'number', format: '0,0.00' },
            { title: "VALUE", type: 'number', format: '0,0.00' } ];
        if (hasTextColumn) {  headers.push( { title: "DESCRIPTION", type: 'text', format: '0,0.00' }) }

        if(empty || datasetData.index.length==0) {
            data = DataGridXL.createEmptyData(20, headers.length)
        } else {
            if (hasTextColumn) {
                data = col_to_row(datasetData.index, datasetData.value, datasetData.description);
                console.log("has text ", data);
            } else {
                data = col_to_row(datasetData.index, datasetData.value);
            };
        };
        
        datasetPropertiesDataGrid = new DataGridXL("dialog-properties-dataset-data-grid", {
            data: data,
            columns: headers,
            allowDeleteCols: false,
            allowMoveCols: false,
            allowInsertCols: false,
            allowHideCols: false,
            allowHideRows: false,
            allowMoveRows: false,
            colHeaderHeight: 16,
            colHeaderWidth: 20,
            colHeaderLabelType: "numbers",
            colHeaderLabelAlign: "center",
            colAlign: "right",
            rowHeight: 16,
            frozenRows: 0,
            topBar: false,
            bottomBar: false,
        });
    };

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
                        _ids: [datasetSelect.val()],
                        names: datasetSelect.find("option:selected").toArray().map(item => item.text)
                    }
                    if (selectedDatasets._ids) {
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
                    } else {
                        window.alert("Please select dataset(s)!")
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
                    console.log("Apply");
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
            // renderGridDatasetPropertiesData();
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
                            console.log(result.dataset);
                            $('#dialog-properties-dataset-name').val(result.dataset.name);
                            $('#dialog-properties-dataset-description').val(result.dataset.description);
                            $('#dialog-properties-dataset-data-type').val(result.dataset.dataType);
                            $('#dialog-properties-dataset-data-unit').val(result.dataset.dataUnit);
                            $('#dialog-properties-dataset-index-type').val(result.dataset.indexType);
                            $('#dialog-properties-dataset-index-unit').val(result.dataset.indexUnit);
                            $('#dialog-properties-dataset-reference-level').val(result.dataset.referenceLevel);
                            $('#dialog-properties-dataset-reference-date').val(result.dataset.referenceDate);

                            renderGridDatasetPropertiesData(result.dataset.hasTextColumn, result.dataset.data, empty=false);

                            $("#tabs").tabs({
                                activate: function (event, ui) {
                                    const activeTabId = ui.newPanel.attr("id"); // Get the ID of the activated tab
                                    if (activeTabId==="tabs-2") {
                                        if (datasetSelect.val()) {
                                            renderGridDatasetPropertiesData(result.dataset.hasTextColumn, result.dataset.data, empty=false);
                                        } else {
                                            console.log("open tab data with no selected dataset");
                                            renderGridDatasetPropertiesData(false, null, empty=true);
                                        }
                                    };
                                },
                            });
                            
                            // set tab parameters
                            const parametersText = `Dataset name: ${result.dataset.name}\nDate created: ${result.dataset.dateCreated} \n`;
                            $("#dialog-properties-dataset-parameters-textarea").val(parametersText);

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
            // $(this).dialog('destroy');
        }
    });

    const dataTypeOptions = [
        {text: "GR - Gamma Ray", value: "GR"},
        {text: "DT - Sonic", value: "DT"},
        {text: "RT - Resistivity", value: "RT"},
        {text: "RHOB - Density", value: "RHOB"},
        {text: "PP - Pore Pressure Gradient", value: "PP"},
        {text: "FG - Fracture Gradient", value: "FG"},
        {text: "OBG - Overburden Gradient", value: "OBG"},
        {text: "POISSON - Poisson Ratio", value: "POISSON"},
        {text: "UNKNOWN", value: "Unknown"},
    ];

    // Define mapping between data types and units
    // const pressureGradientUnits2 = ["sg", "ppg", "psi/ft", "g/cc", "kPa/m", "Pa/m", "MPa/m"];
    // const dataTypeToUnits2 = {
    //     "PP": pressureGradientUnits,
    //     "FG": pressureGradientUnits,
    //     "OBG": pressureGradientUnits,
    //     "Temperature": ["Celsius", "Fahrenheit"],
    //     "Unknown": ["unknown"],
    //     "POISSON": ["unitless"],
    //     "GR": ["GAPI", "API"],
    //     "RT": ["ohmm"],
    //     "DT": ["us/ft", "us/m"],
    //     "RHOB": pressureGradientUnits,
    // };

    const dataTypeSelect = $("#dialog-properties-dataset-advanced-data-type-select");
    dataTypeOptions.forEach(dataTypeOption => {
        dataTypeSelect.append(`<option value="${dataTypeOption.value}">${dataTypeOption.text}</option>`);
    });
});