Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

Array.prototype.last = function() {
    return (this[this.length - 1]);
}

kronos(() => {
    var regex = /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}\n^\* Water/gm,
        regexDate = /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}/gm,
        regexWindows = /^\* Windows/gm;

    const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

    let codeArea = new CodeFlask("#codeArea", {
        language: "js",
        lineNumbers: false
    });

    let code = '',
        Inter = null,
        windows = false,
        TimeWindows = '',
        H = null,
        M = null;

    kronos().request('POST', "/file", {}, res => {
        codeArea.updateCode(res.data);
    });

    let Waterlevel = [],
        WaterLevelStr = "",
        Humidity = [],
        Temperature = [],
        HeatIndex = [],
        Index = [],
        Air = [],
        AirSlope = [],
        AirLevelStr = "";

    var ctx = document.getElementById('myChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Index,
            datasets: [{
                label: 'Humidity',
                data: Humidity,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.2)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1,
                yAxisID: 'y',
            }, {
                label: 'Temperature',
                data: Temperature,
                backgroundColor: ['rgba(255, 159, 64, 0.2)'],
                borderColor: ['rgba(255, 159, 64, 1)'],
                borderWidth: 1,
                yAxisID: 'y',
            }, {
                label: 'Heat Index',
                data: HeatIndex,
                backgroundColor: ['rgba(255, 206, 86, 0.2)'],
                borderColor: ['rgba(255, 206, 86, 1)'],
                borderWidth: 1,
                yAxisID: 'y',
            }, {
                label: 'Water Level',
                data: Waterlevel,
                backgroundColor: ['rgba(75, 192, 192, 0.2)'],
                borderColor: ['rgba(75, 192, 192, 1)'],
                borderWidth: 1,
                yAxisID: 'y1',
            }, {
                label: 'Air Quality',
                data: Air,
                backgroundColor: ['rgba(216, 216, 216, 0.2)'],
                borderColor: ['rgba(216, 216, 216, 1)'],
                borderWidth: 1,
                yAxisID: 'y',
            }]
        },
        options: {
            scales: {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 20,
                        stacked: true
                    }
                },
                y: {
                    beginAtZero: true,
                    type: 'linear',
                    position: 'left',
                    suggestedMin: 0,
                    suggestedMax: 100
                },
                y1: {
                    beginAtZero: true,
                    type: 'linear',
                    position: 'right',
                    suggestedMin: 0,
                    suggestedMax: 600,
                    reverse: true
                }
            }
        }
    });

    function SetArrayGraph() {
        if (Index.length > 29) {
            Waterlevel.shift();
            Humidity.shift();
            Temperature.shift();
            HeatIndex.shift();
            Index.shift();
            Air.shift();
        }
    }

    function FindWaterLevel(soilMoistureValue) {
        var WaterValue = 260,
            AirValue = 520,
            intervals = (AirValue - WaterValue) / 3;

        if (soilMoistureValue > WaterValue && soilMoistureValue < (WaterValue + intervals)) {
            WaterLevelStr = "Very Wet";
        } else if (soilMoistureValue > (WaterValue + intervals) && soilMoistureValue < (AirValue - intervals)) {
            WaterLevelStr = "Wet";
        } else if (soilMoistureValue < AirValue && soilMoistureValue > (AirValue - intervals)) {
            WaterLevelStr = "Dry";
        } else if (soilMoistureValue > WaterValue) {
            WaterLevelStr = "Low Dry";
        };

        kronos("#Water\\ Level > span").html(WaterLevelStr);
        return WaterLevelStr;
    };

    function FindAirLevel(current_quality) {

        if (current_quality == 0) {
            AirLevelStr = "Danger pollution";
        } else if (current_quality == 1) {
            AirLevelStr = "High pollution";
        } else if (current_quality == 2) {
            AirLevelStr = "Low pollution";
        } else if (current_quality == 3) {
            AirLevelStr = "Fresh air";
        }

        kronos("#Air\\ Level > span").html(AirLevelStr);
        return AirLevelStr;
    };

    function LastWater(data) {
        var DateNeedWater = new Date((data.match(regex).last().split('\n')[0]).split("/").reverse()).addDays(10)
        if (new Date().getTime() >= DateNeedWater.getTime() || (FindWaterLevel(Waterlevel.last()) == "Low Dry" && Humidity.last() < 30)) {
            kronos('div#TreeTopNav').attr("add", "class", "show");
        } else if (new Date().getTime() <= DateNeedWater.getTime()) {
            if ("show" == kronos('div#TreeTopNav')[0].className) {
                kronos('div#TreeTopNav').attr("remove", "class");
            };
        };
    };

    Inter = setInterval(() => {
        kronos().request("POST", "/data", {}, res => {
            LastWater(codeArea.getCode());
            // Water level
            resval = res["Water Level"]
            FindWaterLevel(resval);
            FindAirLevel(res["Air Quality Slope"]);

            // Humidity
            kronos("#Humidity > span").html(`${res["Humidity"]} %`);

            // Temperature
            kronos("#Temperature > span").html(`${res["Temperature"]} °C`);

            // Heat Index
            kronos("#Heat\\ Index > span").html(`${res["Heat Index"]} °C`);

            Waterlevel.push(resval);
            Humidity.push(res["Humidity"]);
            Temperature.push(res["Temperature"]);
            HeatIndex.push(res["Heat Index"]);
            Air.push(res["Air Quality"]);
            AirSlope.push(res["Air Quality Slope"]);
            if (Index.length == 0) {
                Index.push(Waterlevel.length - 1);
            } else {
                Index.push(Index.last() + 1);
            };
            SetArrayGraph();
            myChart.update();
        });
    }, 5000);


    kronos('input#TimeS').on('input', () => {
        if (Inter != null) {
            clearInterval(Inter);
        };

        Inter = setInterval(() => {
            kronos().request("POST", "/data", {}, res => {
                LastWater(codeArea.getCode());
                // Water level
                resval = res["Water Level"]
                FindWaterLevel(resval);
                FindAirLevel(res["Air Quality Slope"]);

                // Humidity
                kronos("#Humidity > span").html(`${res["Humidity"]} %`);

                // Temperature
                kronos("#Temperature > span").html(`${res["Temperature"]} °C`);

                // Heat Index
                kronos("#Heat\\ Index > span").html(`${res["Heat Index"]} °C`);

                Waterlevel.push(resval);
                Humidity.push(res["Humidity"]);
                Temperature.push(res["Temperature"]);
                HeatIndex.push(res["Heat Index"]);
                Air.push(res["Air Quality"]);
                if (Index.length == 0) {
                    Index.push(Waterlevel.length - 1);
                } else {
                    Index.push(Index.last() + 1);
                };
                SetArrayGraph();
                myChart.update();
            });
        }, (kronos('input#TimeS').value() * 1000));
    });

    function checkData(Type, Data) {
        if (Type == "Temperature") {
            if (Data < 10) { return `Danger ${Data} °C`; } else {
                if (Data >= 13 && Data <= 30) { return `Good ${Data} °C`; } else { return `exceeds ${Data} °C`; };
            }
        };

        if (Type == "Humidity") {
            if (Data >= 30 && Data <= 80) {
                return `Good ${Data} %`;
            } else {
                if (Data < 30) {
                    return `exceed ${Data-30} %`;
                } else {
                    return `exceed ${Data-80} %`;
                };
            };
        };

        if (Type == "Water Level") {
            return FindWaterLevel(Data);
        }

        if (Type == "Air Quality") {
            return FindAirLevel(Data);
        }
    }

    function Time() {
        var datereport = new Date(),
            datemin = datereport.getMinutes();

        if (datemin.length == 1) {
            datemin = "0" + datemin
        };

        H = datereport.getHours();
        M = datemin;
    };

    function ReportDate() {
        var lastDate = new Date(((codeArea.getCode()).match(regexDate).last()).split("/").reverse());

        if (lastDate.toLocaleDateString() != new Date().toLocaleDateString()) {
            codeArea.updateCode(`${codeArea.getCode()}\n${new Date().toLocaleDateString()}`);
        };
    }


    kronos('button#report').on('click', () => {
        ReportDate();
        Time();

        codeArea.updateCode(`${codeArea.getCode()}\n*** ${H}h${M}
    Water Level : ${Math.round(average(Waterlevel))} (${checkData("Water Level", Math.round(average(Waterlevel)))})
    Humidity : ${Math.round(average(Humidity))} % (${checkData("Humidity", Math.round(average(Humidity)))})
    Temperature : ${Math.round(average(Temperature))} °C (${checkData("Temperature", Math.round(average(Temperature)))})
    Heat Index : ${Math.round(average(HeatIndex))} °C
    Air Quality : ${Math.round(average(Air))} (${checkData("Air Quality", Math.round(average(AirSlope)))})
***`);
    });

    kronos('button#save').on('click', () => {
        kronos().request("POST", "/SetFile", { data: codeArea.getCode() }, res => {
            kronos().request('POST', "/file", {}, res => {
                codeArea.updateCode(res.data);
            });
        });
    });

    kronos('button#water').on('click', () => {
        ReportDate();
        Time();

        codeArea.updateCode(`${codeArea.getCode()}\n* Water ${H}h${M}`);
    });

    kronos('button#windows').on('click', () => {
        ReportDate();
        Time();

        if (windows) {
            codeArea.updateCode(`${codeArea.getCode()}\n* Windows Close ${H}h${M} (${new Date(new Date().getTime() - TimeWindows).getMinutes()} min)`);
        } else {
            codeArea.updateCode(`${codeArea.getCode()}\n* Windows Open ${H}h${M}`);
            TimeWindows = new Date().getTime();
            windows = true;
        }
    })

});