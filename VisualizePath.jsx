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

    var chosenDiameter = 2;
    var chosenDiameterHandles = 2;
    var chosenColor = blackSw;
    var chosenColorHandles = whiteSw;
    var shapeEllipse = true;
    var shapeEllipseHandles = true;

    // ---------- UI ----------
    var w = new Window("dialog", "Visualize Path");
    w.alignChildren = "fill";

    var pNodes = w.add("panel", undefined, "Nodes");
    pNodes.orientation = "row";
    pNodes.add("statictext", undefined, "Size:");
    var sizeInput = pNodes.add("edittext", undefined, chosenDiameter.toString());
    sizeInput.characters = 4;
    pNodes.add("statictext", undefined, "mm");
    pNodes.add("statictext", undefined, "Color:");
    var colorDropdown = pNodes.add("dropdownlist", undefined, ["Black", "White"]);
    colorDropdown.selection = 0;
    pNodes.add("statictext", undefined, "Shape:");
    var shapeDropdown = pNodes.add("dropdownlist", undefined, ["Round", "Square"]);
    shapeDropdown.selection = 0;

    var pHandles = w.add("panel", undefined, "Handles");
    pHandles.orientation = "row";
    pHandles.add("statictext", undefined, "Size:");
    var sizeInputH = pHandles.add("edittext", undefined, chosenDiameterHandles.toString());
    sizeInputH.characters = 4;
    pHandles.add("statictext", undefined, "mm");
    pHandles.add("statictext", undefined, "Color:");
    var colorDropdownH = pHandles.add("dropdownlist", undefined, ["Black", "White"]);
    colorDropdownH.selection = 1;
    pHandles.add("statictext", undefined, "Shape:");
    var shapeDropdownH = pHandles.add("dropdownlist", undefined, ["Round", "Square"]);
    shapeDropdownH.selection = 0;

	var ctrl = w.add("group");
	var refreshBtn = ctrl.add("button", undefined, "Preview");
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
        chosenDiameter = parseVal(sizeInput, 2);
        chosenDiameterHandles = parseVal(sizeInputH, 2);
        chosenColor = (colorDropdown.selection.index === 1) ? whiteSw : blackSw;
        chosenColorHandles = (colorDropdownH.selection.index === 1) ? whiteSw : blackSw;
        shapeEllipse = (shapeDropdown.selection.index === 0);
        shapeEllipseHandles = (shapeDropdownH.selection.index === 0);
    }

    // ---------- event logic ----------
	function triggerPreview() {
		updateValues();
		drawPreview();
	}

	// Manual preview only; no live preview to avoid sluggishness/bugs

	refreshBtn.onClick = triggerPreview;
	resetBtn.onClick = function () {
		clearPreview();
        sizeInput.text = sizeInputH.text = "2";
        colorDropdown.selection = 0;
        colorDropdownH.selection = 1;
        shapeDropdown.selection = shapeDropdownH.selection = 0;
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
        var page = item.parentPage || app.activeWindow.activePage || doc.pages[0];
        if (item.constructor.name === "TextFrame") {
            var dup = item.duplicate(page);
            var outlined = dup.createOutlines(false);
            dup.remove();
            var arr = (outlined instanceof Array) ? outlined : [outlined];
            for (var i = 0; i < arr.length; i++) flattenAndDraw(arr[i], layer);
            for (var j = 0; j < arr.length; j++) { try { arr[j].remove(); } catch (e) { } }
        } else {
            flattenAndDraw(item, layer);
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
                if (!eq(a, l)) { drawLine(a, l, layer); drawDot(l, layer, chosenColorHandles, chosenDiameterHandles, shapeEllipseHandles); }
                if (!eq(a, r)) { drawLine(a, r, layer); drawDot(r, layer, chosenColorHandles, chosenDiameterHandles, shapeEllipseHandles); }
                drawDot(a, layer, chosenColor, chosenDiameter, shapeEllipse);
            }
        }
    }

	function drawLine(a, b, layer) {
        var page = app.activeWindow.activePage || doc.pages[0];
		var line = page.graphicLines.add(layer);
        line.strokeWeight = 0.25;
        line.strokeColor = blackSw;
        line.paths[0].entirePath = [a, b];
		line.label = PREVIEW_LABEL;
    }

	function drawDot(pt, layer, fillSw, diameter, isEllipse) {
        var d = diameter;
        var r = d / 2;
        var top = pt[1] - r, left = pt[0] - r, bottom = pt[1] + r, right = pt[0] + r;
        var page = app.activeWindow.activePage || doc.pages[0];
        if (isEllipse) {
			var oval = page.ovals.add(layer, undefined, undefined, {
                geometricBounds: [top, left, bottom, right],
                fillColor: fillSw,
                strokeColor: blackSw,
                strokeWeight: 0.25
			});
			oval.label = PREVIEW_LABEL;
        } else {
			var rect = page.rectangles.add(layer, undefined, undefined, {
                geometricBounds: [top, left, bottom, right],
                fillColor: fillSw,
                strokeColor: blackSw,
                strokeWeight: 0.25
			});
			rect.label = PREVIEW_LABEL;
        }
    }

    function eq(a, b) {
        return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
    }
})();
