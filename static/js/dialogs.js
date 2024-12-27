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
        modal: true,
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
                
                    // No need to use response.json() as axios returns the data directly
                    const result = response.data;
                
                    if (response.status !== 200) {  // You can also check the response status
                        throw new Error(result.message || "Failed to add project");
                    }
                
                    // Handle successful response here
                    console.log("Project added successfully:", result);
                
                } catch (error) {
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
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        }
        else {
            openProjectTable.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }
        console.log("tr clicked", this);
        openProjectTableSelectedProject = openProjectTable.row(this).data();
        console.log(openProjectTableSelectedProject);
    });

    $("#dialog-open-project").dialog({
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
        buttons: {
            Open: async function () {
                const dialog = $(this)
                try {
                    const result = await activateProject(openProjectTableSelectedProject);
                    console.log("Save result:", result);
        
                    if (result.statusText === "OK") {
                        dialog.dialog("close");  // Use the stored reference to close the dialog
                    }
                } catch (error) {
                    console.error("Failed to save project:", error.message);
                }
            },
            Cancel: function () {
                $(this).dialog("close");  // Close the dialog on cancel
            },
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
                console.log(formattedData);
                openProjectTable.clear();
                openProjectTable.rows.add(formattedData);
                openProjectTable.draw();
            } catch(error) {
                console.error("Failed to fetch projects:", error.message);
            }
            openProjectTable.columns.adjust().draw();
            
        },
        close: () => {
            openProjectTable.$('tr.selected').removeClass('selected');
        }
    });
});