var fullDataset;
var navStack = [];
var currRoot;

function FindNode(node, moniker) {
    // Check if node moniker matches input
    if (node.moniker == moniker) {
        // If match, return the node
        return node;
    }
    else {
        var result;
        // If no match, check if node has children and iterate through
        // them if it does
        if (node.hasOwnProperty('children')) {
            $.each(node.children, function(i, element) {
                // Get result of recursive call on child
                result = FindNode(element, moniker);
                // If the node is found, break the loop
                if (result != null) {
                    return false;
                }
            });
            // If there is a valid result, return it. Else move on to next node
            if (result) {
                return result;
            }
        }
    }
}

function CalculateRatios(nodes) {
    // Get denominator
    var den = 0;
    if ($(".scale-checkbox").is(":checked")) {
        $.each(nodes, function(i, n) { den += n.actual });
    }
    else {
        den = nodes.length
    }

    var num;

    // Add ratio as property to nodes
    $.each(nodes, function(i, n) {
        if ($(".scale-checkbox").is(":checked")) {
            num = n.actual;
        }
        else {
            num = 1;
        }
        n.ratio = parseFloat((num * .995 / den).toFixed(2));
    });
}

function ResetRatio(node) {
    node.ratio = 1;
    if (node.hasOwnProperty("children")) {
        $.each(node.children, function(i, n) {
            ResetRatio(n);
        });
    }
}

function CalculateNodeWidth(node, containerId) {
    // Assume node box takes up all space unless it has ratio specified
    var ratio = 1;
    if (node.hasOwnProperty('ratio')) {
        ratio = node.ratio;
    }

    // Get the width of the container
    var containerWidth = document.getElementById(containerId).getBoundingClientRect().width;
    return (Math.floor(ratio * containerWidth)).toFixed();
}

function AddNode(node, containerId) {
    var nodeWidth = CalculateNodeWidth(node, containerId);
    var nodeHtml = "<div class='node-wrapper' style='width: " + nodeWidth + "px'>" +
                        "<div class='chart-node node-" + node.moniker + "' data-moniker='" + node.moniker + "'>" + node.moniker + "</div>" +
                        "<div class='child-container' id='container" + node.moniker + "'></div>" +
                    "</div>";
    $("#" + containerId).append(nodeHtml);
    return "container" + node.moniker;
}

function ProcessNode(node, containerId) {
    containerId = AddNode(node, containerId);
    if (node.hasOwnProperty('children')) {
        CalculateRatios(node.children);
        $.each(node.children, function(i, child) {
            ProcessNode(child, containerId);
        });
    }
}

function RenderChart(node) {
    ResetRatio(fullDataset.data);
    $("#chartBody").empty();
    ProcessNode(node, "chartBody");
}

function InitializeChart(data) {
    fullDataset = data;
    currRoot = data.data;
    $(".chart-title").text(data.title);
    $(".chart-description").html(data.description);
    //RenderChart(data.data);
    RenderSvg(fullDataset.data);
    $(".breakdown-svg").append(svgString);
}

function AddEventHandlers() {
    $(document).on("click", ".chart-node", function() {
        navStack.push(currRoot);
        $(".action-up").removeClass("inactive");
        currRoot = FindNode(fullDataset.data, $(this).attr('data-moniker'));
        if (currRoot) {
            RenderChart(currRoot);
        }
    });
    $(".action-up").click(function() {
        if (navStack.length > 0) {
            currRoot = navStack.pop();
            if (navStack.length == 0) {
                $(".action-up").addClass("inactive");
            }
            if (currRoot) {
                RenderChart(currRoot);
            }
        }
    });
    $(".scale-checkbox").change(function(){
        RenderChart(currRoot);
    });
}

var svgString = "";
const nodeHeight = 100;

function GetNodeWidth(node, parent) {
    // Assume node box takes up all space unless it has ratio specified
    var ratio = 1;
    if (node.hasOwnProperty('ratio')) {
        ratio = node.ratio;
    }
    return (Math.floor(ratio * parent.width)).toFixed();
}

function MakeNode(node, parent) {
    var nodeWidth = GetNodeWidth(node, parent);
    svgString += "<rect width='" + nodeWidth + "' height='" + nodeHeight + "' style='fill: grey; stroke-width: 1; stroke: white' id='rect-" + node.moniker + "' />";
    return { x: parseInt(parent.x), y: parseInt(parent.y) + parseInt(nodeHeight), width: parseInt(nodeWidth) };
}

function PaintNode(node, parent) {
    parent = MakeNode(node, parent);
    if (node.hasOwnProperty('children')) {
        // Create a grouping node so that children may be added to it
        svgString += "<g transform='translate(" + parent.x + ", " + nodeHeight +")'>";
        CalculateRatios(node.children);
        $.each(node.children, function(i, child) {
            PaintNode(child, parent);
        });
        // Close grouping element for this node
        svgString += "</g>";
    }
}

function RenderSvg(node) {
    ResetRatio(fullDataset.data);
    $(".breakdown-svg").empty();
    svgString += "<svg width='100%' height='310'>";
    PaintNode(node, { x: 0, y: 0, width: parseInt($(".breakdown-svg").css("width").replace("px", "")) });
    svgString += "</svg>";
}

$(document).ready(function() {
    $.getJSON('js/data.json', InitializeChart);
    AddEventHandlers();
});