// Function to format the date as YYYY/MM/DD
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.getFullYear() + '/' + (date.getMonth() + 1).toString().padStart(2, '0') + '/' + date.getDate().toString().padStart(2, '0');
};

// Fetch to select
const fetchWellsToSelect = async(projectId, wellSelect) => {
    if (projectId) {
        try {
            const wells = await getWells(`project_id=${projectId}`);
            wellSelect.empty();
            wells.forEach(well => {
                wellSelect.append(`<option value="${well._id}">${well.name}</option>`);
            });
            // if (wellSelect.find('option').length > 0) {
            //     wellSelect.prop('selectedIndex', 0).change();
            // }
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
            wellbores.forEach(wellbore => {
                wellboreSelect.append(`<option value="${wellbore._id}">${wellbore.name}</option>`);
            });
            // if (wellboreSelect.find('option').length > 0) {
            //     wellboreSelect.prop('selectedIndex', 0).change(); // Select the first option
            // }
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
    await fetchWellsToSelect(projectId, wellSelect);
    wellSelect.off('change').on('change', async function () {
        const selectedWellId = $(this).val();
        await fetchWellboresToSelect(selectedWellId, wellboreSelect);
        if (wellboreSelect.find('option').length > 0) {
            wellboreSelect.prop('selectedIndex', 0).change(); // Select the first option
        }
    });
    if (wellSelect.find('option').length > 0) {
        wellSelect.prop('selectedIndex', 0).change();
    }
};

const fetchWellsWellboresDatasetsToSelect = async(projectId, wellSelect, wellboreSelect, datasetSelect) => {
    
    wellboreSelect.off('change').on('change', async function () {
        const selectedWellboreId = $(this).val();
        await fetchDatasetsToSelect(selectedWellboreId, datasetSelect);
        if (datasetSelect.find('option').length > 0) {
            datasetSelect.prop('selectedIndex', 0).change(); // Select the first option
        }
    });

    await fetchWellsToSelect(projectId, wellSelect);
    wellSelect.off('change').on('change', async function () {
        const selectedWellId = $(this).val();
        await fetchWellboresToSelect(selectedWellId, wellboreSelect);
        if (wellboreSelect.find('option').length > 0) {
            wellboreSelect.prop('selectedIndex', 0).change(); // Select the first option
        }
        datasetSelect.empty();
    });
    if (wellSelect.find('option').length > 0) {
        wellSelect.prop('selectedIndex', 0).change();
    }
};

function fetchUnitGroupSelect(unitGroupSelect) {
    unitGroupSelect.empty();
    window.userDataConfig.unit_groups.forEach(unit_group => {
        unitGroupSelect.append(`<option value="${unit_group.name}">${unit_group.name}</option>`);
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

function datasetPropertiesToParametersText(datasetProperties) {
    const parametersText = `Method: ${datasetProperties.method}\n\
    Dataset name: ${datasetProperties.name}\n\
    Datatype: ${datasetProperties.data_type}\n\
    Date created: ${datasetProperties.date_created}\n\
    Min depth: ${Math.min(...datasetProperties.data.index)}\n\
    Max depth: ${Math.max(...datasetProperties.data.index)}\n\
    Min value: ${Math.min(...datasetProperties.data.value)}\n\
    Max value: ${Math.max(...datasetProperties.data.value)}`;
    return parametersText;
};

function transposeAndConvert(array, skipColumn, skipColumnIndex=null) {
    const nEmptyRow = 0;
    // const emptyArray = Array.from({ length: array[0].length }, () => Array(nEmptyRow).fill(null));
    const emptyArray = Array.from({ length: array[0].length }, () => Array(nEmptyRow));
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

async function addDataTypeDataUnitOptions(dataTypeSelect, dataUnitSelect, dataTypeDefault, dataUnitDefault) {
    if (!window.userDataConfig) {
        await initConfig();
    };
    const dataTypes = window.userDataConfig.data_types;
    const unitGroups = window.userDataConfig.unit_groups;

    // Populate DataType Select
    dataTypeSelect.empty();
    dataTypes.forEach(dataType => {
        dataTypeSelect.append(
            `<option value="${dataType.name}">${dataType.name} - ${dataType.description}</option>`
        );
    });

    // Map DataTypes to Units
    const dataUnitOptions = {};
    unitGroups.forEach(unitGroup => {
        unitGroup.unit.forEach(unit => {
            if (!dataUnitOptions[unitGroup.name]) {
                dataUnitOptions[unitGroup.name] = [];
            }
            dataUnitOptions[unitGroup.name].push(unit.name);
        });
    });

    // Handle DataType Change
    dataTypeSelect.off('change');
    dataTypeSelect.on('change', function () {
        const selectedDataType = $(this).val();
        const matchedUnitGroup = dataTypes.find(dt => dt.name === selectedDataType)?.unit_group;
        
        dataUnitSelect.empty();
        if (matchedUnitGroup && dataUnitOptions[matchedUnitGroup]) {
            dataUnitOptions[matchedUnitGroup].forEach(unit => {
                dataUnitSelect.append(`<option value="${unit}">${unit}</option>`);
            });
        } else {
            dataUnitSelect.append('<option value="">-</option>');
        }
    });
                    
    dataTypeSelect.val(dataTypeDefault).change();
    dataUnitSelect.val(dataUnitDefault).change();
};

async function initConfigIfNeeded() {
    if (!window.userDataConfig) {
        await initConfig();
    }
}

async function createDatasetHandleDatasetInput(
    inputSelector,
    dataTypeSelect,
    dataUnitSelect,
    colorSelector,
    lineStyleSelector,
    lineWidthSelector,
    symbolSelector,
    symbolSizeSelector
    ) {
    await initConfigIfNeeded();

    const dataTypes = window.userDataConfig.data_types;
    const unitGroups = window.userDataConfig.unit_groups;

    // Map data types for easier lookup
    const datasetTypeMapping = {};
    dataTypes.forEach(dataType => {
        datasetTypeMapping[dataType.name.toUpperCase()] = dataType;
    });

    // Map unit groups to unit options
    const dataUnitOptions = {};
    unitGroups.forEach(unitGroup => {
        dataUnitOptions[unitGroup.name] = unitGroup.unit.map(unit => unit.name);
    });

    // Populate data type options initially
    $(dataTypeSelect).empty();
    dataTypes.forEach(dataType => {
        $(dataTypeSelect).append(`<option value="${dataType.name}">${dataType.name} - ${dataType.description}</option>`);
    });

    // Handle dataset name input
    $(inputSelector).off('input').on('input', function () {
        const inputValue = $(this).val().toUpperCase(); // Normalize input
        let matchedType = 'UNKNOWN';
        let matchedDataType = null;

        for (const keyword in datasetTypeMapping) {
            if (inputValue.includes(keyword)) {
                matchedType = keyword;
                matchedDataType = datasetTypeMapping[keyword];
                // console.log("Matched Type:", matchedType);
                break;
            }
        }

        // Update data type dropdown and trigger change event
        $(dataTypeSelect).val(matchedType).change();
    });

    // Handle manual selection of data type
    $(dataTypeSelect).off('change').on('change', function () {
        const selectedDataType = $(this).val();
        const matchedDataType = dataTypes.find(dt => dt.name === selectedDataType);

        if (matchedDataType) {
            // console.log("Manually Selected Type:", selectedDataType);

            // Update unit group dropdown
            const matchedUnitGroup = matchedDataType.unit_group;
            $(dataUnitSelect).empty();

            if (matchedUnitGroup && dataUnitOptions[matchedUnitGroup]) {
                dataUnitOptions[matchedUnitGroup].forEach(unit => {
                    $(dataUnitSelect).append(`<option value="${unit}">${unit}</option>`);
                });
            } else {
                $(dataUnitSelect).append('<option value="">-</option>');
            }

            // Set initial unit selection
            if (dataUnitOptions.length > 0) {
                $(dataUnitSelect).val(dataUnitOptions[0]).change(); // Trigger change event
            }

            // Apply display attributes
            if (matchedDataType.display_attributes) {
                // console.log("Applying Display Attributes:", matchedDataType.display_attributes);
                createDatasetApplyDisplayAttributes(
                    colorSelector,
                    lineStyleSelector,
                    lineWidthSelector,
                    symbolSelector,
                    symbolSizeSelector,
                    matchedDataType.display_attributes
                );
            }
        }
    });

    // Set initial selection based on the first data type
    if (dataTypes.length > 0) {
        const initialDataType = dataTypes[0];
        $(dataTypeSelect).val(initialDataType.name).change(); // Trigger change event
    }
}


function createDatasetApplyDisplayAttributes(colorSelector, lineStyleSelector, lineWidthSelector, symbolSelector, symbolSizeSelector, displayAttributes) {
    if (!displayAttributes) {
        console.warn("No display attributes found.");
        return;
    }
    $(colorSelector).val(displayAttributes.color || '');
    $(lineStyleSelector).val(displayAttributes.line_style || '');
    $(lineWidthSelector).val(displayAttributes.line_width || '');
    $(symbolSelector).val(displayAttributes.symbol || '');
    $(symbolSizeSelector).val(displayAttributes.symbol_size || '');
}


class AddWelldataTable {
constructor(dataTableSelector, tableId) {
    this.dataTableSelector = dataTableSelector;
    this.tableId = tableId;
    this.tableInstance = $(dataTableSelector).DataTable({
        paging: false,
        scrollCollapse: true,
        scrollY: 200,
        info: false,
        retrieve: true,
        ordering: false,
        columns: [
            {
                title: `<input type="checkbox" class="select-all-checkbox" data-table-id="${tableId}" />`, // Class-based selector
                data: null,
                render: function () {
                    return '<input type="checkbox" class="row-checkbox" />';
                },
                orderable: false,
                searchable: false,
                width: '10%' // Optional: Adjust the width
            },
            { title: 'Name', data: 'name' },
            { title: 'UID', data: 'uid' },
            { title: 'Description', data: 'description' }
        ],
        data: [],
    });

    this.bindEventListeners();
}

// Render data into the table
render(wells) {
    this.tableInstance.clear();
    this.tableInstance.rows.add(wells);
    this.tableInstance.columns.adjust().draw();
}

// Bind checkbox-related event listeners
bindEventListeners() {
    const tableId = this.tableId;

    $(document).on('click', `.select-all-checkbox[data-table-id="${tableId}"]`, (event) => {
        const isChecked = event.target.checked;
        const rows = this.tableInstance.rows({ search: 'applied' }).nodes();
        $('input.row-checkbox', rows).prop('checked', isChecked);
    });

    $(this.dataTableSelector).on('change', 'input.row-checkbox', () => {
        const allCheckboxes = $('input.row-checkbox', this.tableInstance.rows({ search: 'applied' }).nodes());
        const allChecked = allCheckboxes.length === allCheckboxes.filter(':checked').length;

        $(`.select-all-checkbox[data-table-id="${tableId}"]`).prop('checked', allChecked);
    });
}

getCheckedRows() {
    const checkedRows = [];
    $(`${this.dataTableSelector} tbody input.row-checkbox:checked`).each((_, checkbox) => {
        const row = $(checkbox).closest('tr'); // Get the closest row
        const rowData = this.tableInstance.row(row).data(); // Retrieve row data
        checkedRows.push(rowData); // Add row data to the array
    });
    return checkedRows; // Return the array of checked rows
}
}

class gridTableSurvey {
constructor(element) {
    this.element = element;
    this.header = [ { title: "MD" }, { title: "TVD" }, { title: "Inclination" }, { title: "Azimuth" } ];
    this.surveyInputGrid = null;
    this.calcTVD = false;
}
col_to_row(...columns) {
    let result = [];
    const numRows = columns[0].length;
    for (let i = 0; i < numRows; i++) {
        let row = [];
        for (let j = 0; j < columns.length; j++) {
            row.push(columns[j][i]);
        }
        result.push(row);
    }
    return result;
}

transposeAndConvert(array, skipColumn, skipColumnIndex=null) {
    const nEmptyRow = 0;
    // const emptyArray = Array.from({ length: array[0].length }, () => Array(nEmptyRow).fill(null));
    const emptyArray = Array.from({ length: array[0].length }, () => Array(nEmptyRow));
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

render(surveyData=null) {
    var data;
    if(surveyData && surveyData.md.length>0) {
        data = this.col_to_row(surveyData.md, surveyData.tvd, surveyData.inclination, surveyData.azimuth);
    } else {
        data = DataGridXL.createEmptyData(10, 4)
    };
    this.surveyInputGrid = new DataGridXL(this.element, {
        data: data,
        columns: this.header,
        allowDeleteCols: false,
        allowMoveCols: false,
        allowInsertCols: false,
        allowHideCols: false,
        allowHideRows: false,
        allowMoveRows: false,
        colHeaderHeight: 16,
        colHeaderWidth: 5,
        colHeaderLabelType: "numbers",
        colHeaderLabelAlign: "center",
        colAlign: "right",
        colWidth: 75,
        rowHeight: 15,
        frozenRows: 0,
        topBar: false,
        bottomBar: false,
    });
}
getFormattedData() {
    var formatted;
    if (this.calcTVD) {
        formatted = transposeAndConvert(this.surveyInputGrid.getData(), true, 1)
    } else {
        formatted = transposeAndConvert(this.surveyInputGrid.getData(), false, null)
    }
    return (formatted);
}
};

class gridTableDataset {
    constructor(element) {
        this.element = element;
        this.datasetInputGrid = null;
    }
    col_to_row(...columns) {
        let result = [];
        const numRows = columns[0].length;
        for (let i = 0; i < numRows; i++) {
            let row = [];
            for (let j = 0; j < columns.length; j++) {
                row.push(columns[j][i]);
            }
            result.push(row);
        }
        return result;
    }

    transposeAndConvert(array, skipColumn, skipColumnIndex=null) {
        const nEmptyRow = 0;
        const emptyArray = Array.from({ length: array[0].length }, () => Array(nEmptyRow));
        if (array.length === 0 || array.every(row => row.every(cell => cell === null))) {
            return {
                ok: true,
                message: 'ok',
                data: emptyArray
            };
        }
    
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

    render(dataset=null, hasTextColumn) {
        this.hasTextColumn = hasTextColumn;
        if (hasTextColumn) {
            this.header = [ { title: "Index" }, { title: "Value" },  {title: "Description" } ];
        } else {
            this.header = [ { title: "Index" }, { title: "Value" } ];
        };
        var data;
        if(dataset && dataset.index.length>0) {
            if (hasTextColumn) {
                data = this.col_to_row(dataset.index, dataset.value, dataset.description);
            } else {
                data = this.col_to_row(dataset.index, dataset.value);
            };
        } else {
            if (hasTextColumn) {
                data = DataGridXL.createEmptyData(20, 3);
            } else {
                data = DataGridXL.createEmptyData(20, 2);
            }
        };
        this.datasetInputGrid = new DataGridXL(this.element, {
            data: data,
            columns: this.header,
            allowDeleteCols: false,
            allowMoveCols: false,
            allowInsertCols: false,
            allowHideCols: false,
            allowHideRows: false,
            allowMoveRows: false,
            colHeaderHeight: 16,
            colHeaderWidth: 5,
            colHeaderLabelType: "numbers",
            colHeaderLabelAlign: "center",
            colAlign: "right",
            colWidth: 75,
            rowHeight: 15,
            frozenRows: 0,
            topBar: false,
            bottomBar: false,
        });
    }
    getFormattedData() {
        var formatted;
        if (this.hasTextColumn) {
            formatted = transposeAndConvert(this.datasetInputGrid.getData(), true, 2)
        } else {
            formatted = transposeAndConvert(this.datasetInputGrid.getData(), false, null)
        }
        return (formatted);
    }
};

class DataTableBase {
    constructor(dataTableSelector, options) {
        this.dataTableSelector = dataTableSelector;
        this.options = options;
        this.selectedRow = null;

        // Initialize DataTable with passed options
        this.tableInstance = $(dataTableSelector).DataTable({
            paging: options.paging ?? false,
            searching: options.searching ?? false,
            scrollCollapse: true,
            scrollY: options.height ?? 200,
            info: false,
            retrieve: true,
            ordering: options.ordering ?? true,
            columns: options.columns || [],
            data: options.data || [],
        });

        this.bindEventListeners();
    }

    render(data) {
        this.tableInstance.clear();
        this.tableInstance.rows.add(data);
        this.tableInstance.columns.adjust().draw();
    }

    bindEventListeners() {
        const self = this; // Preserve the `this` context for the instance
        $(this.dataTableSelector).off('click').on('click', 'tr', function () {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
                self.selectedRow = null;
            } else {
                self.tableInstance.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');
                self.selectedRow = self.tableInstance.row(this).data();
            }
        });
    }

    getSelectedRows() {
        return this.selectedRow;
    }
}

class ProjectDataTable extends DataTableBase {
    constructor(dataTableSelector, options = {}) {
        super(dataTableSelector, {
            ...options,
            columns: options.columns || [
                { title: 'Name', data: 'name' },
                { title: 'Analyst', data: 'analyst' },
                { title: 'Date Created', data: 'date_created' },
            ],
        });
    }
}

// // Usage Example
// const projectTable = new ProjectDataTable('#projectTable', {
//     searching: true,
//     height: 250,
//     ordering: true,
// });

class WellDataTable extends DataTableBase {
    constructor(dataTableSelector, options = {}) {
        super(dataTableSelector, {
            ...options,
            columns: options.columns || [
                { title: 'Name', data: 'name' },
                { title: 'WD', data: 'water_depth' },
                { title: 'ID', data: 'uid' },
            ],
        });
    }
}

class WellboreDataTable extends DataTableBase {
    constructor(dataTableSelector, options = {}) {
        super(dataTableSelector, {
            ...options,
            columns: options.columns || [
                { title: 'Well', data: 'well_name' },
                { title: 'Wellbore', data: 'name' },
                { title: 'AG', data: 'air_gap' },
                { title: 'WD', data: 'water_depth' },
                { title: 'TVD', data: 'total_tvd' },
                { title: 'MD', data: 'total_md' },
            ],
        });
    }
}

class DatasetDataTable extends DataTableBase {
    constructor(dataTableSelector, options = {}) {
        super(dataTableSelector, {
            ...options,
            columns: options.columns || [
                { title: 'Well', data: 'well_name' },
                { title: 'Wellbore', data: 'wellbore_name' },
                { title: 'Dataset', data: 'name' },
                { title: 'Datatype', data: 'data_type' },
                { title: 'Unit', data: 'data_unit' },
            ],
        });
    }
}

class DatatypeDataTable extends DataTableBase {
    constructor(dataTableSelector, options = {}, unitGroupSelect, selectedDatatypeNameEl, selectedDatatypeDescriptionEl, selectedDatatypeDisplayEl) {
        super(dataTableSelector, {
            ...options,
            columns: options.columns || [
                { title: 'Name', data: 'name' },
                { title: 'Description', data: 'description' },
                { title: 'Unit Group', data: 'unit_group' },
            ],
        });

        this.unitGroupSelect = unitGroupSelect;
        this.selectedDatatypeNameEl = selectedDatatypeNameEl;
        this.selectedDatatypeDescriptionEl = selectedDatatypeDescriptionEl;
        this.selectedDatatypeDisplayEl = selectedDatatypeDisplayEl;

        this.bindChangeEvent();
    }

    // Binds the event when a row is selected
    bindChangeEvent() {
        const self = this;
        $(this.dataTableSelector).on('click', 'tr', function () {
            const selectedRow = self.getSelectedRows();
            if (selectedRow && selectedRow.unit_group) {
                self.updateDatatypeAttribute(selectedRow);
            }
        });
    }

    updateDatatypeAttribute(selectedRow) {
        this.unitGroupSelect.val(selectedRow.unit_group);
        this.selectedDatatypeNameEl.val(selectedRow.name);
        this.selectedDatatypeDescriptionEl.val(selectedRow.description);
        // this.selectedDatatypeDisplayEl.val()
    }

}


class TreeTable {
    constructor(tableId) {
        this.tableId = tableId;
    }

    renderTable(data) {
        this.data = data;
        let tbody = document.getElementById("tree-body");
        tbody.innerHTML = "";

        this.data.forEach((group, groupIndex) => {
            // Generate a unique ID for the group
            let groupId = `group-${groupIndex}`;

            // Add the group row
            let groupRow = `<tr data-tt-id='${groupId}' data-group-name='${group.name}'>
                                <td class='dropdown-symbol'>+ ${group.name}</td>
                                <td>${group.description}</td>
                                <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                            </tr>`;
            tbody.innerHTML += groupRow;

            // Add the unit rows
            group.unit.forEach((unit, unitIndex) => {
                let unitId = `${groupId}-${unitIndex}`;
                let unitRow = `<tr data-tt-id='${unitId}' data-tt-parent-id='${groupId}' data-group-name='${group.name}' data-unit-name='${unit.name}'>
                                    <td>${unit.name}</td>
                                    <td>${unit.description}</td>
                                    <td>${unit.min_filter === null ? "" : unit.min_filter}</td>
                                    <td>${unit.max_filter === null ? "" : unit.max_filter}</td>
                                    <td>${unit.linear_min}</td>
                                    <td>${unit.linear_max}</td>
                                    <td>${unit.log_min}</td>
                                    <td>${unit.log_max}</td>
                                    <td>${unit.convert_factor}</td>
                                    <td>${unit.shift_factor}</td>
                                </tr>`;
                tbody.innerHTML += unitRow;
            });
        });

        // Initialize the treetable
        $(`#${this.tableId}`).treetable({ expandable: true });

        // Attach event listeners
        this.attachEventListeners();
    }

    attachEventListeners() {
        let self = this; // Store reference to TreeTable instance
    
        $("#tree-body").off("click").on("click", "tr", function () {
            let groupName = $(this).attr("data-group-name") || null;
            let unitName = $(this).attr("data-unit-name") || null;
    
            // Remove selection from all rows
            $("#tree-body tr").removeClass("tree-table-selected");
    
            // Select the clicked row
            $(this).addClass("tree-table-selected");
    
            // Update selectedRowData in TreeTable instance
            self.selectedRowData = {
                groupName: groupName,
                unitName: unitName
            };
            // console.log(self.selectedRowData);
        });
    }

    getSelectedRow() {
        return (this.selectedRowData);
    };
}


