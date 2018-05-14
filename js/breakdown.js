var svg;
var chartWidth = parseInt($("#chart").css("width").replace("px", ""));
var chartHeight = 300;
var navStack = [];
var currRoot;

function GetColor(level, position, parentColor) {
    switch(level) {
        case 1: return '#aaa';
        case 2: 
            switch(position) {
                case 0: return '#f03b20';
                case 1: return '#756bb1';
                case 2: return '#2b8cbe';
                case 3: return '#31a354';
                case 4: return '#c51b8a';
                case 5: return '#2c7fb8';
                case 6: return '#3182bd';
            }
            break;
        case 3:
            switch(parentColor) {
                case '#2c7fb8': return '#7fcdbb';
                case '#31a354': return '#addd8e';
                case '#c51b8a': return '#fa9fb5';
                case '#2b8cbe': return '#a6bddb';
                case '#f03b20': return '#feb24c';
                case '#756bb1': return '#bcbddc';
                case '#3182bd': return '#9ecae1';
            }
            break;
        default: return '#888';
    }
}
var level = 1;
function AssignColors(node, position, parentColor) {
    node.color = GetColor(level, position, parentColor);
    if (node.children) {
        level++;
        $.each(node.children, function(i, child) {
            AssignColors(child, i, node.color);
        });
        level--
    }
}
function AssignRatios(node, scale) {
    if (node.children) {
        var den = 0;
        if (scale) {
            $.each(node.children, function(i, n) { den += n.actual; });
        }
        else den = node.children.length;

        $.each(node.children, function(i, n) {
            if (scale) {
                n.ratio = parseFloat((n.actual / den).toFixed(6));
            }
            else {
                n.ratio = parseFloat((1 / den).toFixed(6));
            }
            AssignRatios(n, scale);
        });
    }
}
function ResetRatio(node) {
    node.ratio = 1;
    if (node.children) {
        $.each(node.children, function(i, n) {
            ResetRatio(n);
        });
    }
}
function GetParentX(parent) {
    var width = 0;
    if ($(parent).children()) {
        $.each($(parent).children(), function (i, child) {
            width += parseInt($(child).css("width").replace("px", ""));
        });
    }
    return width;
}
function FindDataNode(node, moniker) {
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
                result = FindDataNode(element, moniker);
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
function RenderNode(node, target, nodeLeft, nodeWidth) {
    var rect = target.append('rect')
        .attr('x', nodeLeft)
        .attr('width', nodeWidth)
        .attr('height', 100)
        .attr('data-node', node.moniker)
        .attr('class', 'geo-node')
        .style('fill', node.color)
        .style('stroke', '#fff');

    var textGroup = target.append('g').attr('transform', 'translate(' + nodeLeft + ', 0)');
    textGroup.append('text').attr('x', 5).attr('y', 20).attr('class', 'geo-node-name').style('fill', '#fff').text(node.moniker);
    textGroup.append('text').attr('x', 5).attr('y', 45).attr('class', 'geo-node-actual').style('fill', '#fff').text("$" + node.actual + "M");
    textGroup.append('text').attr('x', 5).attr('y', 65).attr('class', 'geo-node-variance').style('fill', '#fff').text("(" + ((node.actual / node.budget) * 100).toFixed() + "%)");
    
    if (node.children) {
        target = target.append('g').attr('transform', 'translate(' + nodeLeft + ', 100)').attr('data-node', node.moniker);
        var childWidth = 0
        $.each(node.children, function(i, child) {
            var scaleFactor = 1;
            if (child.hasOwnProperty('ratio')) {
                scaleFactor = child.ratio;
            }
            var newNodeWidth = parseFloat((scaleFactor * nodeWidth).toFixed(2));
            RenderNode(child, target, childWidth, newNodeWidth);
            childWidth += newNodeWidth;
        });
    }
}
function InitializeChart() {
    $(".chart-title").text(chartData.title);
    $(".chart-description").text(chartData.description);
    $(".chart-updated").text(chartData.updated);
    svg = d3.select("#chart").append("svg").attr('width', chartWidth).attr('height', chartHeight).style("background-color", "#f2f2f2");
    $("#timeSlider").slider();
}
function RenderChart(node, scale) {
    AssignRatios(node, scale);
    $('svg').empty();
    RenderNode(node, svg, 0, chartWidth);
}
function AddEventHandlers() {
    $(document).on("click", ".geo-node", function() {
        ResetRatio(currRoot);
        navStack.push(currRoot);
        currRoot = FindDataNode(currRoot, $(this).attr('data-node'));
        RenderChart(currRoot, $('.action-scale').hasClass('active'));
    });
    $(document).on("click", ".action-up", function() {
        if (navStack.length > 0) {
            currRoot = navStack.pop();
            RenderChart(currRoot, $('.action-scale').hasClass('active'));
        }
    });
    $(document).on("click", ".action-scale", function() {
        $(this).toggleClass("active");
        RenderChart(currRoot, $('.action-scale').hasClass('active'));
    });
}

var chartData;
var nodeData;
$(document).ready(function(){
    $.getJSON('/js/data.json', function(data) { 
        chartData = data;
        nodeData = data.data;
        AssignColors(nodeData, 0, '');
        InitializeChart();
        currRoot = nodeData;
        RenderChart(currRoot, $('.action-scale').hasClass('active'));
        AddEventHandlers();
    });
});