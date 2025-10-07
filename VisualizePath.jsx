//=================================================================================================================================//
// DESCRIPTION: This Indd script visualizes the Anchorpoints and  Handles of the letters in the textframe.
// Samara Keller -- www.samarakeller.com
// Version v0.1 – 2025‑10‑07
// License: MIT
//=================================================================================================================================//

//--icon for the "folderPicker" button
/* eslint-disable */
// Visualize Path
//#target "InDesign"


(function () {
    'use strict';
    if (app.documents.length === 0) { alert("Open a document first."); return; }
    var doc = app.activeDocument;

    var PREVIEW_LAYER = "VisualizeHandles_Preview";
    var FINAL_LAYER = "VisualizeHandles";
	var PREVIEW_LABEL = "VisualizeHandles_Preview_Item";

    var blackSw = doc.swatches.itemByName("Black");
    var whiteSw = doc.swatches.itemByName("Paper");
    if (!blackSw.isValid) blackSw = doc.swatches[0];
    if (!whiteSw.isValid) whiteSw = doc.swatches[1];

    var settings = {
        nodeSize: 2,
        handleSize: 2,
        nodeColor: blackSw,
        handleColor: whiteSw,
        nodeShape: true, // true = ellipse, false = rectangle
        handleShape: true
    };

    // ---------- UI ----------
    var w = new Window("dialog", "Visualize Path");
    w.alignChildren = "fill";

    function createControlPanel(title, sizeValue, colorIndex, shapeIndex) {
        var panel = w.add("panel", undefined, title);
        panel.orientation = "row";
        
        panel.add("statictext", undefined, "Size:");
        var sizeInput = panel.add("edittext", undefined, sizeValue.toString());
        sizeInput.characters = 4;
        panel.add("statictext", undefined, "pt");
        
        panel.add("statictext", undefined, "Color:");
        var colorDropdown = panel.add("dropdownlist", undefined, ["Black", "White"]);
        colorDropdown.selection = colorIndex;
        
        panel.add("statictext", undefined, "Shape:");
        var shapeDropdown = panel.add("dropdownlist", undefined, ["Round", "Square"]);
        shapeDropdown.selection = shapeIndex;
        
        return { sizeInput: sizeInput, colorDropdown: colorDropdown, shapeDropdown: shapeDropdown };
    }

    var nodeControls = createControlPanel("Nodes", settings.nodeSize, 0, 0);
    var handleControls = createControlPanel("Handles", settings.handleSize, 1, 0);

    var ctrl = w.add("group");
    var previewBtn = ctrl.add("button", undefined, "Preview");
    var resetBtn = ctrl.add("button", undefined, "Reset");

    var btns = w.add("group");
    btns.alignment = "right";
    var okBtn = btns.add("button", undefined, "OK");
    var cancelBtn = btns.add("button", undefined, "Cancel");

    // ---------- helpers ----------
    function parseVal(fld, def) {
        var v = parseFloat(fld.text);
        return (!isNaN(v) && v > 0) ? v : def;
    }

    function updateValues() {
        settings.nodeSize = parseVal(nodeControls.sizeInput, 2);
        settings.handleSize = parseVal(handleControls.sizeInput, 2);
        settings.nodeColor = (nodeControls.colorDropdown.selection.index === 1) ? whiteSw : blackSw;
        settings.handleColor = (handleControls.colorDropdown.selection.index === 1) ? whiteSw : blackSw;
        settings.nodeShape = (nodeControls.shapeDropdown.selection.index === 0);
        settings.handleShape = (handleControls.shapeDropdown.selection.index === 0);
    }

    // ---------- event logic ----------
	function triggerPreview() {
		updateValues();
		drawPreview();
	}

	// Manual preview only; no live preview to avoid sluggishness/bugs

    previewBtn.onClick = triggerPreview;
    resetBtn.onClick = function () {
        clearPreview();
        nodeControls.sizeInput.text = handleControls.sizeInput.text = "2";
        nodeControls.colorDropdown.selection = 0;
        handleControls.colorDropdown.selection = 1;
        nodeControls.shapeDropdown.selection = handleControls.shapeDropdown.selection = 0;
        // Do not auto-preview after reset; user can hit Preview
    };
	cancelBtn.onClick = function () { clearPreview(); w.close(); };

	okBtn.onClick = function () {
		clearPreview();
        clearLayer(FINAL_LAYER);
        updateValues();
        if (app.selection.length === 0) { alert("Select objects first."); return; }
        var layer = ensureLayer(FINAL_LAYER);
        for (var i = 0; i < app.selection.length; i++) processItem(app.selection[i], layer);
        w.close();
    };

    w.center();
    w.show();

    // ---------- core drawing ----------
    function ensureLayer(name) {
        try {
            var l = doc.layers.itemByName(name);
            if (!l.isValid) throw "x";
            return l;
        } catch (e) {
            return doc.layers.add({ name: name });
        }
    }

	function clearLayer(name) {
        try {
            var l = doc.layers.itemByName(name);
            if (l.isValid) l.remove();
        } catch (e) { }
    }

	function clearPreview() {
		// Safely remove only preview-generated items by label, never the whole layer
		try {
			var l = doc.layers.itemByName(PREVIEW_LAYER);
			if (!l.isValid) return;
			var items = l.allPageItems;
			for (var i = items.length - 1; i >= 0; i--) {
				try {
					if (items[i].label === PREVIEW_LABEL) items[i].remove();
				} catch (e) {}
			}
		} catch (e) {}
	}

	function drawPreview() {
		clearPreview();
        var layer = ensureLayer(PREVIEW_LAYER);
        if (app.selection.length === 0) { return; }
        for (var i = 0; i < app.selection.length; i++) processItem(app.selection[i], layer);
    }

    function processItem(item, layer) {
        try {
            var page = getActivePage();
            if (item.constructor.name === "TextFrame") {
                var dup = item.duplicate(page);
                var outlined = dup.createOutlines(false);
                dup.remove();
                var arr = (outlined instanceof Array) ? outlined : [outlined];
                for (var i = 0; i < arr.length; i++) {
                    flattenAndDraw(arr[i], layer);
                }
                // Clean up temporary outlined objects
                for (var j = 0; j < arr.length; j++) {
                    try { arr[j].remove(); } catch (e) {}
                }
            } else {
                flattenAndDraw(item, layer);
            }
        } catch (e) {
            // Skip items that can't be processed (e.g., deleted items)
        }
    }

    function flattenAndDraw(it, layer) {
        if (it.paths && it.paths.length > 0) {
            drawFromItem(it, layer);
        } else if (it.allPageItems && it.allPageItems.length > 0) {
            for (var i = 0; i < it.allPageItems.length; i++) flattenAndDraw(it.allPageItems[i], layer);
        }
    }

    function drawFromItem(it, layer) {
        for (var pi = 0; pi < it.paths.length; pi++) {
            var path = it.paths[pi];
            for (var pp = 0; pp < path.pathPoints.length; pp++) {
                var p = path.pathPoints[pp];
                var a = p.anchor, l = p.leftDirection, r = p.rightDirection;
                if (!eq(a, l)) {
                    drawLine(a, l, layer);
                    drawDot(l, layer, settings.handleColor, settings.handleSize, settings.handleShape);
                }
                if (!eq(a, r)) {
                    drawLine(a, r, layer);
                    drawDot(r, layer, settings.handleColor, settings.handleSize, settings.handleShape);
                }
                drawDot(a, layer, settings.nodeColor, settings.nodeSize, settings.nodeShape);
            }
        }
    }

    function drawLine(a, b, layer) {
        var page = getActivePage();
        var line = page.graphicLines.add(layer);
        line.strokeWeight = 0.25;
        line.strokeColor = blackSw;
        line.paths[0].entirePath = [a, b];
        line.label = PREVIEW_LABEL;
    }

    function drawDot(pt, layer, fillSw, diameter, isEllipse) {
        var r = diameter / 2;
        var bounds = [pt[1] - r, pt[0] - r, pt[1] + r, pt[0] + r];
        var page = getActivePage();
        var shape;
        
        if (isEllipse) {
            shape = page.ovals.add(layer, undefined, undefined, {
                geometricBounds: bounds,
                fillColor: fillSw,
                strokeColor: blackSw,
                strokeWeight: 0.25
            });
        } else {
            shape = page.rectangles.add(layer, undefined, undefined, {
                geometricBounds: bounds,
                fillColor: fillSw,
                strokeColor: blackSw,
                strokeWeight: 0.25
            });
        }
        shape.label = PREVIEW_LABEL;
    }

    function getActivePage() {
        return app.activeWindow.activePage || doc.pages[0];
    }

    function eq(a, b) {
        return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
    }
})();
