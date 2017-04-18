//wrap everything in a self-executing anonymous function
(function(){

//variables for data to join
var attrArray = ["p_unins", "pcp_rat", "dent_rat", "mhp_rat", "prev_hos_rate", "p_Rec_hba1c", "p_mamm", "p_unins_adult", "p_unins_child", "costs", "other_pcp_rat", "hh_inc"];
    
var attrName = {
    p_unins: "Percent Uninsured", 
    pcp_rat: "Primary Care Physicians Ratio", 
    dent_rat: "Dentist Ratio", 
    mhp_rat: "Mental Health Providers Ratio", 
    prev_hos_rate: "Preventable Hospital Rate", 
    p_Rec_hba1c: "Diabetic Monitoring - % Recieving HbA1c", 
    p_mamm: "Mammography Screening (%)", 
    p_unins_adult: "Percent Uninsured Adults", 
    p_unins_child: "Percent Uninsured Children", 
    costs: "Health Care Costs", 
    other_pcp_rat: "Other Primary Care Providers Ratio", 
    hh_inc: "Median Household Income ($)"
}

var attrDesc = {
    p_unins: "Percentage of population under age 65 without health insurance", 
    pcp_rat: "Ratio of primary care physicians to population", 
    dent_rat: "Ratio of dentitsts to population", 
    mhp_rat: "Ratio of mental health providers to population", 
    prev_hos_rate: "Number of hospitals stays for ambulatory-care sensitive conditions per 1,000 Medicare enrolees", 
    p_Rec_hba1c: "Percentage of diabetic Medicare enrollees ages 65-75 that receive HbA1c monitoring", 
    p_mamm: "Percentage of female Medicare enrollees ages 67-69 that recieve mammography screening", 
    p_unins_adult: "Percentage of the population ages 18 to 65 that has no health insurance coverage", 
    p_unins_child: "Percentage of the population under age 19 that has no health insurance coverage", 
    costs: "The price-adjusted Medicare reimbursements (Parts A and B) per enrollee", 
    other_pcp_rat: "Ratio of the number of other primary care provders to population (Other primary care providers include nurse practitioners (NPs), physician assistants (PAs), and clinical nurse specialists)", 
    hh_inc: "The income where half of households in a county earn more and half of households earn less"
}

var expressed = attrArray[0]; //initial attribute


//collect items to size map based on window size
var margin = {top: 10, left: 10, bottom: 10, right: 10}
  , width = parseInt(d3.select('#map').style('width'))
  , width = width - margin.left - margin.right
  , mapRatio = .3
  , height = width * mapRatio;

//total page height
var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

var pageTitleH= parseInt(d3.select('#title').style('height'));

//chart frame dimensions
var chartWidth = window.innerWidth * 0.97,
    chartHeight = (h-height-pageTitleH)*0.77,
    leftPadding = 35,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([chartHeight-10, 0])
    .domain([0, 30]);


    
//begin script when window loads
window.onload = setMap(width, height);

//set up choropleth map
function setMap(width, height){
    
    //map frame dimensions
    //var width = window.innerWidth * .9
    //var height = 350;
    
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create albers equal area conic projection centerd on VA
    var projection = d3.geoAlbers()
        .center([0, 39.05])
        .rotate([81.00, 0.00, 0])
        .parallels([19.95, 35.65])
        .scale(width*5.7)
        .translate([width / 3, height / 6]);
    
    //create path generator
    var path = d3.geoPath()
        .projection(projection);

    
    //use queue to parallelize asynchonous data loading
    d3.queue()
        .defer(d3.csv, "data/data.csv")
        .defer(d3.json, "data/VaCounties.topojson")
        .await(callback);
    
    function callback(error, csvData, virginia){
        //translate virginia topojson
        var va = topojson.feature(virginia, virginia.objects.GO_Virginia_Regions).features;
        
        //join csv data to geojson enumeration units
        va = joinData(va, csvData);
        
        //create the color scale
        var colorScale = makeColorScale(csvData);
        
        //add enumeration units to the map
        setEnumerationUnits(va, map, path, colorScale);
        
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        
        //drop down
        createDropdown(csvData);
        
        //console.log(error);
        //console.log(csvData);
        console.log(va);
    };
};

function makeColorScale(data){
    var colorClasses =[
        "#f2f0f7",
        "#cbc9e2",
        "#9e9ac8",
        "#756bb1",
        "#54278f"
    ];
    
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
    
    console.log(colorScale.quantiles())
};
    
//function to test for data values and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attributes value exists, assing a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return '#404040'
    };
};
    
function joinData(va, csvData){
    //loop through csv to assign each set of csv attribute values to geojson county
    for (var i = 0; i<csvData.length; i++){
        var csvCounty = csvData[i];
        var csvKey = csvCounty.fips;
            
        for (var a = 0; a< va.length; a++){
            var geojsonProps = va[a].properties;
            var geojsonKey = geojsonProps.fips;
            
            if (geojsonKey == csvKey){
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvCounty[attr]);
                    geojsonProps[attr] = val;
                });
            };
        };
    };
    return va;
};

function setEnumerationUnits(va, map, path, colorScale){
    //add Virginia to the map
    var counties = map.selectAll(".counties")
        .data(va)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "counties " + d.properties.fips;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
    var desc = counties.append("desc")
        .text('{"stroke": "black", "stroke-opacity": "0.8", "stroke-width": "0.5px", "stroke-linecap": "round"}');
};

function setChart(csvData, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each county
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.fips;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
        
    
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 60)
        .attr("y", 15)
        .attr("class", "chartTitle")
        //.text("Number of Variable " + expressed[3] + " in each region");
    
    //create a text element for the data description
    //var dataDesc = chart.append("text")
        //.attr("x", 60)
        //.attr("y", 15)
        //.attr("class", "dataDesc");
    
    //create vertical axis generator
    var yAxis = d3.axisLeft(yScale);
        //.scale(yScale)
        //.orient("left");

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //set bar positions heights and colors
    updateChart(bars, csvData.length, colorScale);
};
    
//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        }); 
    
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");
    
    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d) {return attrName[d]});
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    
    //recolor enumeration units
    var counties = d3.selectAll(".counties")
        .transition()
        .duration(1000)
        .style("fill", function (d){
            return choropleth(d.properties, colorScale)
        });
    
    //get the max value for the selected attribute
    var max = d3.max(csvData, function(d){
        return + parseFloat(d[expressed])
    });
    
    //set reset yScale
    yScale = d3.scaleLinear()
        .range([chartHeight-10, 0])
        .domain([0, max]);
    
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //resort bars
        .sort(function(a,b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i *5
        })
        .duration(500);
    
    var datadesc = d3.select("#datadesc")
        .text(attrDesc[expressed]);
    
    
    updateChart(bars, csvData.length, colorScale);
};

function updateChart(bars, n, colorScale){
    
    //position bars
    bars.attr("x", function (d,i){
        return i * (chartInnerWidth / n) + leftPadding;
    })
    
    //size/resize bars return 0 for values less than zero
    .attr("height", function(d){
        var outHeight = (chartHeight-9) -  yScale(d[expressed]);
        if (outHeight < 0) {
            return 0;
        } else {
            return outHeight;
        }})
    .attr("y", function(d) {
        var outY = yScale(d[expressed]) +5;
        if (outY < 0) {
            return 0;
        } else {
            return outY;
        }})          
    
    //color/recolor bars
    .style("fill", function(d){
        return choropleth(d, colorScale);
    }); 
    
    var chartTitle = d3.select(".chartTitle")
        .text(attrName[expressed] + " by County in Virginia");
    
    //update the chart axis
    var yAxis = d3.axisLeft()
        .scale(yScale)
    
    d3.selectAll("g.axis")
        .call(yAxis);
};
    
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.fips)
        .style("stroke", "#F5BB00")
        .style("stroke-width", "3");
    setLabel(props);
};

//function to reset the element style on mouseout    
function dehighlight(props){
    var selected = d3.selectAll("." + props.fips)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
        var styleObject = JSON.parse(styleText);
        
        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

//function to create dynamic label
function setLabel(props){
    //label content
    var ratio = expressed.includes("rat");
    var percent = expressed.startsWith("p_");
    var rate = expressed.includes("prev");

    if (rate == true){ 
        if (props[expressed] > 0){
            var labelAttribute = "<h2>" + props[expressed].toLocaleString() + "</h2><b>" + attrName[expressed] + "</b>";
        }else{
            var labelAttribute = "<h2>" + "No Data" + "</h2><b>" + attrName[expressed] + "</b>";
        };
    
    } else if (ratio == true) {
        if (props[expressed] > 0){
            var labelAttribute = "<h2>" + "1:" + props[expressed].toLocaleString() + "</h2><b>" + attrName[expressed] + "</b>";
        }else{
            var labelAttribute = "<h2>" + "No Data" + "</h2><b>" + attrName[expressed] + "</b>";
        };
    } else if (percent == true){
        if (props[expressed] >0){
            var labelAttribute = "<h2>" + props[expressed].toLocaleString() + "%"+ "</h2><b>" + attrName[expressed] + "</b>"
        } else{
            var labelAttribute = "<h2>" + "No Data"+ "</h2><b>" + attrName[expressed] + "</b>"
        };
    } else{
        if (props[expressed] >0){
            var labelAttribute = "<h2>" + "$" + props[expressed].toLocaleString() + "</h2><b>" + attrName[expressed] + "</b>"
        } else{
            var labelAttribute = "<h2>" + "No Data"+ "</h2><b>" + attrName[expressed] + "</b>"
        }
    };
    
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.fips + "_label")
        .html(labelAttribute)
    
    var countyName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.Name);
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
    
    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;
    
    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 :y1;
    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
    
function rescale(data) {
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    //get max
    maxData = d3.max(domainArray, function(d){
        return d.max;
    })
    
    // change domain to go from 0 to the max
    axis = d3.selectAll(".axis")
    yScale = d3.scaleLinear()
        .domain([0, maxData])
        .range([0, chartHeight-10]);
    axis.select(".axis")
            .transition().duration(1500).ease("sin-in-out")  // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
            .call(yAxis);  

    vis.select(".axis")
        .text("Rescaled Axis");
};
    
})();