/**********************************************************
*
* MODULE: 		index.js
*
* PROJECT: 		appTestAPI
*
* DESCRIPTION:	Main
*
***********************************************************/

// 
// Function: main
//
(function() {
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
    //var container, stats;
    //var camera, controls, scene, renderer;
    var loadedModels = [];
    var previousData = false;

    window.onload = function() {
        // prevent mouse clicks from going to model while dialog is open
        $('#stl-tolerance-modal').bind('click mousedown', function(e) {
            e.stopImmediatePropagation();
        });

        $('#stl-tolerance-submit').click(function() {
            deleteModels();
            var angleTolerance = $('#angle-tolerance').val();
            var chordTolerance = $('#chord-tolerance').val();
            loadStl(angleTolerance, chordTolerance);
            $('#stl-tolerance-modal').modal('hide');
        });

        init();
        loadStl(-1, -1);
        //animate();
    }

	// 
	// Function: init
	//
    function init() {
		
		// DEBUG
		console.log("** DEBUG: init()");
		
        // Setup the drop list for models ...
        $("#elt-select2").append("<option>-- Top of List --</option>");

        var elementsDict;
		
        // Get the elements and parts data
		getElements().then(getParts);
        //window.addEventListener( 'resize', onWindowResize, false );
    }
	
	// 
	// Function: loadStl
	//
	function loadStl(angleTolerance, chordTolerance) {
		
		// DEBUG
		console.log("** DEBUG: loadStl()");
		
		// Grab STL data from server. Information about which STL to grab is located
		// in the URL query string.
		
		var url = '/api/stl' + window.location.search;

        // Parse the search string to make sure we have the last piece to load
        var local = window.location.search;
        var index = local.indexOf("&stl");
        if (index > -1) {
            // Find the last stl segment and keep just that part
            var lastIndex = local.lastIndexOf("&stl");
            if (index != lastIndex) {
                var baseLocal = local.substring(0, index);
                var lastLocal = local.substring(lastIndex);
                var newLocal = baseLocal + lastLocal;

                url = '/api/stl' + newLocal;
            }
        }

        var binary = false;

        if (angleTolerance && chordTolerance) {
            url += '&angleTolerance=' + angleTolerance;
            url += '&chordTolerance=' + chordTolerance;
        }

        $('#stl-progress-bar').removeClass('hidden');

		// Displays STL data
        $.ajax(url, {
            type: 'GET',
            data: {
                binary: binary
            },
            success: function(data) {
                if (binary) {
                    // Convert base64 encoded string to Uint8Array
                    var u8 = new Uint8Array(atob(data).split('').map(function(c) {
                        return c.charCodeAt(0);
                    }));
                    // Load stl data from buffer of Uint8Array
                    //loadStlData(u8.buffer);
                } else {
                    // ASCII
                   //loadStlData(data);
                }
                $('#stl-progress-bar').addClass('hidden')
            }
        });
    }

    // 
	// Function: getElements
	//
    function getElements() {
		
		// DEBUG
		console.log("** DEBUG: getElements()");
		
        var dfd = $.Deferred();
        $.ajax('/api/elements'+ window.location.search, {
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                addElements(data, dfd);
            },
            error: function() {
            }
        });
		
		console.log("** DEBUG: Elements:  /api/elements"+ window.location.search);
		
        return dfd.promise();
    }

	// 
	// Function: getParts
	//
    function getParts() {
		
		// DEBUG
		console.log("** DEBUG: getParts()");
		
        var dfd = $.Deferred();
        $.ajax('/api/parts' + window.location.search, {
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                addParts(data, dfd, elementsDict);
            },
            error: function() {
            }
        });
		
		console.log("** DEBUG: Parts:  /api/parts"+ window.location.search);
		
        return dfd.promise();
    }

	// 
	// Function: addElements
	//
    function addElements(data, dfd) {
		
		// DEBUG
		console.log("** DEBUG: addElements()");
        
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        for (var i = 0; i < data.length; ++i) {
            if (data[i].elementType === "PARTSTUDIO") {
                // URL must contain query string!
                // (Query string contains document and workspace information)
                var href = "/" + window.location.search + "&stlElementId=" + data[i].id;
                $("#elt-select2")
                    .append(
                    "<option href='" + href + "'>" + "Element: " + data[i].name + "</option>"
                )
				console.log("** DEBUG: Adding element: ", data[i].name);
            }
        }

        elementsDict = createElementsDict(data);
        dfd.resolve();
    }

	// 
	// Function: createElementsDict
	//
    function createElementsDict(elementsArray) {
		
		// DEBUG
		console.log("** DEBUG: createElementsDict()");
		
        dict = {};
        for (var i = 0; i < elementsArray.length; ++i) {
            dict[elementsArray[i]["id"]] = elementsArray[i];		
        }
        return dict;
    }

	// 
	// Function: addParts
	//
    function addParts(data, dfd, elementsDict) {
		
		// DEBUG
		console.log("** DEBUG: addParts()");
		
        data.sort(function(a, b) {
            var key1 = a["elementId"];
            var key2 = b["elementId"];
            if (key1 < key2) {
                return -1;
            } else if (key1 > key2) {
                return 1;
            } else {
                return 0;
            }
        });

        var prevElementId = null;
        var partList = null;
        for (var i = 0; i < data.length; ++i) {
            var elementId = data[i]["elementId"];
            var partId = data[i]["partId"];
            var href = "/" + window.location.search + "&stlElementId=" +
                elementId + "&partId=" + partId;
            $("#elt-select2")
                .append(
                "<option href='" + href + "'>" + "Part: " + data[i].name + "</option>"
            )
			console.log("** DEBUG: Adding part: ", data[i].name);
        }

        dfd.resolve();
    }

	// 
	// Function: createPartList
	//
    function createPartList(partsContainer, elementId, elementName) {
		
		// DEBUG
		console.log("** DEBUG: createPartsList()");
		
        var partListId = 'onshape-parts-' + elementId;
        partsContainer.append("<div class='panel-heading'><h3 class='panel-title'>" +
        escapeString(elementName) + "</h3></div>");
        partsContainer.append("<div class='list-group' id='" + partListId + "'></div>");
        return partListId;
    }

	// 
	// Function: escapeString
	//
    function escapeString(string) {
        return string.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
})();
