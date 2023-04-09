// 1. Generate Data

// set min and max of possible values
let min = 0.1;
let max = 400e12;

// set initial median & quantiles
let smedian = (max-min)/2;
let sq25 = (smedian-min)/2
let sq75 = (max-smedian)/2+smedian

// function to calculate log-normal density based on inputs
function logistic_pdf (input_value, mu, s) {

// calculate proability distribution
let upper_part = Math.exp(-(input_value-mu)/s)
let lower_part = s*(1+Math.exp(-(input_value-mu)/s))**2
return upper_part/lower_part
}

// function to get the data 
function getData(median, q25,q75) {
  let values = [];

  // calculate scale parameters from median and quantiles
  let mu = median
  let s25 = (q25-mu)/Math.log(0.25/(1-0.25))
  let s75 = (q75-mu)/Math.log(0.75/(1-0.75))
  let left =[]
  let right =[]

// calculate left and right half separately
console.log((max-min)/100)
  for (let x = min; x < max; x = x + (max-min)/100){
    let left_half = logistic_pdf(x, mu, s25);
    let right_half = logistic_pdf(x, mu, s75);
    //let joint_y = (x<median) ? left_half:right_half;

    left.push({x:x, y:left_half})
    right.push({x:x, y:right_half})
   
    }

// calculate max density for both halves
let left_max =  Math.max(...left.map(o =>o.y))
let right_max = Math.max(...right.map(o =>o.y))
console.log(right)

let leftn =[]
let rightn =[]

// normalize both densities
for (let i=0;i<left.length;i++){
  let old_left = left[i].y
  let old_right = right[i].y
  leftn.push({x:left[i].x, y: old_left/left_max})
  rightn.push({x:right[i].x, y: old_right/right_max})
}

// filter only half
leftn = leftn.filter(d => d.x<=median);
rightn = rightn.filter( d => d.x>=median);

values = leftn.concat(rightn)
  return values;
}

let values = getData(smedian,sq25,sq75);


// 2. Draw the Graph
//let formatValue = d3.format(".10~e");
let formatNumber = d3.format(".0f"),
    formatTrillion = function(x) { return formatNumber(x / 1e12) + " trillion"; },
    formatBillion = function(x) { return formatNumber(x / 1e9) + " billion"; },
    formatMillion = function(x) { return formatNumber(x / 1e6) + " million"; },
    formatThousand = function(x) { return formatNumber(x / 1e3) + " thousand"; };
    formatNormal = function(x){return x}
function formatAbbreviation(x) {
  var v = Math.abs(x);
  return (v >= .9995e12 ? formatTrillion
      :v >= .9995e9 ? formatBillion
      : v >= .9995e6 ? formatMillion
      : v >=.9995e3 ?formatThousand
      : formatNormal)(x);
}
      
// set the dimensions and margins of the graph
let Allwidth = document.getElementById('chartArea').clientWidth;

let margin = {top: 50, right: 50, bottom: 100, left: 50},
    width = Allwidth - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// set the range for the x axis
let x = d3.scaleLinear()
          .domain(d3.extent(values, d => d.x))
          .range([50, width]).nice();

let xxAxis = d3.axisBottom(x).ticks(10)
.tickFormat(function(d) {return formatAbbreviation(d);});

// set the range for the y axis
let y = d3.scaleLinear()
.range([height, 0])
.domain([Math.min(d3.min(values, d => d.y),0), Math.max(1,d3.max(values, d => d.y))*1.1]).nice()

// set dimensions of graph
const svg = d3.select('#chartArea').append("svg")
svg
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

// get only x value for area between the quartiles
let values_between_q = values.filter(d => d.x<=sq75);
values_between_q = values_between_q.filter(d => sq25 <= d.x);

// add the area under the curve 
let area = d3.area()
    .curve(d3.curveBasis)
    .x(function (d) {return x(d.x); })
    .y0(y(0))
    .y1(function (d) { return y(d.y); });
    
let area_draw = svg.append("path")
    .style("fill", "grey")
    .style('opacity',0.4)
    .attr("d", area(values_between_q)); 
  

// add the density line 
let density_line = svg.append("path")
      .attr("class", "line")
      .datum(values)
      //.attr("fill", "white")
      .attr("fill-opacity", "0")
      .attr("stroke", "#000")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .attr("d",  d3.line()
        .curve(d3.curveBasis)
          .x(function(d) { return x(d.x); })
          .y(function(d) { return y(d.y); })
      );

// add vertical line at median/
//svg.append("line")
//.datum(values)
//.attr("x1", x(smedian)) //<<== change your code here
//.attr("y1", function (d) { return y(d.y); })
//.attr("x2", x(smedian))  //<<== and here
//.attr('y2', height)
//.style("stroke-width", 2)
//.style("stroke", "red")
//.style("fill", "none")
//.attr("d", d3.line(values)
//); 


// 3. Build Slider
// define size of drag handles
let square_size = 20;

// draw drag handle for median, i.e. a rectangle
let median = svg.append('rect')
  .attr('x', x(smedian)-square_size/2)
  .attr('y', height+80)
  .attr('width', square_size)
  .attr('height', square_size)
  .attr('stroke', 'black')
  .attr('fill', '#888888')
  .attr('stroke-width',2)
  .call(d3.drag() // call specific function when median is dragged
         .on("start", dragstarted_median)
         .on("drag", dragged_median)
         .on("end", dragended_median));

let print_median= document.getElementById('print_median');
print_median.innerHTML = formatAbbreviation(smedian);
// draw drag handle for 25% quantile, i.e. a circle
let q25 = svg.append('circle')
  .attr('cx',x(sq25))
  .attr('cy', height+80+square_size/2)
  .attr('r', square_size/2)
  .attr('stroke', 'black')
  .attr('fill', '#D3D3D3')
  .call(d3.drag() // call specific function when quantiel is dragged
         .on("start", dragstarted_q25)
         .on("drag", dragged_q25)
         .on("end", dragended_q25));

let print_q25= document.getElementById('print_q25');
print_q25.innerHTML = formatAbbreviation(sq25);
// draw drag handle for 75% quantile, i.e. a circle
let q75 = svg.append('circle')
  .attr('cx',x(sq75))
  .attr('cy', height+80+square_size/2)
  .attr('r', square_size/2)
  .attr('stroke', 'black')
  .attr('fill', '#D3D3D3')
  .call(d3.drag() // call specific function when quantile is dragged
         .on("start", dragstarted_q75)
         .on("drag", dragged_q75)
         .on("end", dragended_q75));

  let print_q75= document.getElementById('print_q75');
  print_q75.innerHTML = formatAbbreviation(sq75);
   
  // Dragging of Median
  function dragstarted_median(event, d) {
    d3.select(this).attr("stroke-width", 3);
  }

  function dragged_median(event, d) {
    // restrict horizontal dragging to extent of graph
    let left = event.x;
    if (left  > width- square_size/2) {
      left = width - square_size/2
    } else if (event.x  < 0) {
      left = 0
    }
    // drag rectangle
    d3.select(this).attr("x", left);

    // adjust quantile cirlces accordingly
    // make sure that q25 cannot go below 0 or above median
    let q25loc = Number(q25.attr('cx'))
    let q25loc_new = q25loc
    if (q25loc+ event.dx < 0){
      q25loc_new = 0;
    } else if (q25loc+ event.dx > left){
      q25loc_new = left;
    } else {q25loc_new = q25loc+event.dx}
    q25.attr('cx',q25loc_new)

    // make sure that q75 cannot go below median or beyond graph width
    let q75loc = Number(q75.attr('cx'))
    let q75loc_new = q75loc
    if (q75loc+ event.dx > width){
      q25loc_new = width;
    } else if (q75loc+ event.dx < left){
      q75loc_new = left+square_size/2;
    } else {q75loc_new = q75loc+event.dx}
    q75.attr('cx',q75loc_new)

    //let kde = kernelDensityEstimator(kernelEpanechnikov(q25+q75*100), x.ticks(999))
    //let density =  kde(values.map(function(d){ return d+x.invert(left); }) )
    //console.log(smedian)
    let smedian = x.invert(left)
    //console.log(median)
    let values = getData(smedian, x.invert(q25loc_new), x.invert(q75loc_new))
    
    let values_between_q = values.filter(d => d.x<=x.invert(q75loc_new))
    values_between_q = values_between_q.filter(d => x.invert(q25loc_new) <= d.x);
  
    area_draw
      .attr("d", area(values_between_q)); 
    //console.log(smedian);
    print_median.innerHTML = formatAbbreviation(smedian);
    print_q25.innerHTML = formatAbbreviation(x.invert(q25loc_new));
    print_q75.innerHTML = formatAbbreviation(x.invert(q75loc_new));

    density_line
    .datum(values)
    .attr("d",  d3.line()
        .curve(d3.curveBasis)
          .x(function(d) { return x(d.x); })
          .y(function(d) { return y(d.y); })
      );
  }

  function dragended_median(event, d) {
    d3.select(this).attr("stroke-width", 2);

  }

// Dragging of Q25
function dragstarted_q25(event, d) {
    d3.select(this).raise().attr("stroke", "black");
  }

function dragged_q25(event, d) {
  // restrict horizontal dragging to extent of graph
  
  let left = event.x;
  //console.log(median.attr('x'))
  if (left  > median.attr('x')) {
    left = median.attr('x')
  } else if (event.x  <0) {
    left = 0
  }

  d3.select(this).attr("cx", left);

  let values = getData(Number(x.invert(median.attr('x'))),x.invert(left), Number(x.invert(q75.attr('cx'))))

  let values_between_q = values.filter(d => d.x<=q75.attr('cx'))
  values_between_q = values_between_q.filter(d => x.invert(left) <= d.x);
  print_q25.innerHTML = formatAbbreviation(x.invert(left));

  area_draw
    .attr("d", area(values_between_q)); 


  density_line
  .datum(values)
  .attr("d",  d3.line()
      .curve(d3.curveBasis)
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); })
    );



 
  
}

function dragended_q25(event, d) {
  d3.select(this).attr("stroke", null);
}

// Dragging of Q75
function dragstarted_q75(event, d) {
    d3.select(this).raise().attr("stroke", "black");
  }
function dragged_q75(event, d) {
// restrict horizontal dragging to extent of graph

let left = event.x;
if (left  < Number(median.attr('x'))+square_size) {
  left = Number(median.attr('x'))+square_size
} else if (event.x  > width) {
  left = width
}
console.log(event.x)
console.log(median.attr('x'))
d3.select(this).attr("cx", left);

let values = getData(Number(x.invert(median.attr('x'))),Number(x.invert(q25.attr('cx'))), x.invert(left))


let values_between_q = values.filter(d => d.x<=x.invert(left))
values_between_q = values_between_q.filter(d => q25.attr('cx') <= d.x);
print_q75.innerHTML = formatAbbreviation(x.invert(left));

area_draw
  .attr("d", area(values_between_q)); 


density_line
.datum(values)
.attr("d",  d3.line()
    .curve(d3.curveBasis)
      .x(function(d) { return x(d.x); })
      .y(function(d) { return y(d.y); })
  );
}

function dragended_q75(event, d) {
  d3.select(this).attr("stroke", null);
}

// add the area to the plot
//svg.append('path')
  //.data([density])
  //.attr('class','area')
  //.attr('d',area);

// find corresponding x value to max value of density line
//let x_max = density[0][density[1].indexOf(Math.max(...density[1]))];


//function dragstarted() {
  //d3.select(this).raise().classed("active", true);
//}



//function drag () {
  //function dragstarted(event,d){
    //d3.select(this).raise().attr('stroke-width',5);
  //}

  //function dragged(event,d){
    //d3.select(this)
      //.attr('x1',d=x(event.x))
      //.attr('x2',d=x(event.x))
  //}

  //function dragend(event, d){
   // d3.select(this).attr('stroke-width',2);
  //}

  //return d3.drag()
  //.on('start',dragstarted)
  //.on('drag', dragged)
  //.on('end',dragend);

//}


// add a vertical line for max density value
//let line_max = svg.append('line')
//.data([x_max])
//.attr('x1',x(function(d){return d}))
//.attr('y1',0)
//.attr('x2',x(function(d){return d}))
//.attr('y2',height)
//.attr('id','line_max')
//.style('stroke-width',2)
//.style('fill','none')
//.attr('stroke-linejoin','round')
//.style('stroke','black')
//.call(drag)
       // .on('start',   dragstarted)
        //.on("drag", function (){
          //let dx = event.x;
          //xnew = dx > 0 ? 0: dx < 50 ? 50: dx;
          //d3.select(this)
          //.attr('x1',d=x(event.x))
          //.attr('x2',d=x(event.x));

          //update(event.x)
        //}));


  // add the x Axis
let xAxis = svg.append("g")
     .attr('class','axis')
      .attr('id','xaxis')
      .attr("transform", "translate(0," + height + ")")
      .call(xxAxis)
      .selectAll('text')
      .attr('id','xlabel')
      .style("text-anchor", "end") 
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-65)");

  // add the y Axis
  //svg.append("g")
    //  .attr('class','axis')
      //.call(d3.axisLeft(y));

  // add y Axis labels
  svg.append('text')
  .attr('transform','rotate(-90)')
  .attr('class','labels')
  .attr('y',0-margin.left)
  .attr('x',0-(height/2))
  .attr('dy','1em')
  .style('text-anchor','middle')
  .text('Density');

  // add a Title
  let title = svg.append('text')
  .attr('x', (width/2))
  .attr('y', 0-(margin.top/2))
  .attr('text-anchor','middle')
  .style('font-size', '20px')
  .style('font-family','sans-serif')
  //.style('text-decoration','underline')
  .text('Your Estimate')



function showSolution(){
  let button = document.getElementById("solution-button");
  if (button.innerText==='Show Solution'){
  // calculate some numbers to display
  let correct = 113e12;
  let m = x.invert(median.attr('x'))
  let lower = x.invert(q25.attr('cx'))
  let upper = x.invert(q75.attr('cx'))
  console.log(lower)
  let within = ((lower < correct) & (upper > correct)) ? true:false;
  console.log(within)
  let perc_off = (m-correct)/correct;
  function noT(boolean){
    if (boolean) {return ""}
    else{return "<strong>not</strong>"}
  }
  let solution= document.getElementById('solution');
  solution.innerHTML = "The correct answer is " + formatAbbreviation(correct) + ". It is thus " + noT(within) + " within your 50% confidence interval."
  //change button text
  button.innerText="Hide Solution";
// draw line
svg.append("line")
.attr('id','solution-line')
.datum(values)
.attr("x1", x(correct)) //<<== change your code here
.attr("y1", function (d) { return y(d.y); })
.attr("x2", x(correct))  //<<== and here
.attr('y2', height)
.style("stroke-width", 3)
.style("stroke", "#77967c")
.style("fill", "none")

// show OWID graph
document.getElementById('owid').style.display = "block";
}
else{
//  change buttton text
button.innerText="Show Solution";
// remove line
document.getElementById('solution-line').style.display='none';

// remove OWID graph
document.getElementById('owid').style.display = "none";

//remove text
let solution= document.getElementById('solution');
solution.innerHTML = ''

}
}
  