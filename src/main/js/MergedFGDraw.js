/************************************************************************
 Copyright 2020 eBay Inc.
 Author/Developer: Amir Langer

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 **************************************************************************/

function percentage(samples, total) {
    return Math.floor(samples * 10000 / total) / 100;
}

function calculateDiff(samples0, total0, samples1, total1) {
    var total = samples0 + samples1;
    var p0 = samples0/total;
    var p1 = samples1/total;
    var diff =  p0 - p1;
    return diff;
}

function MergedFGDraw(fg, collapsed, visualDiff, differentSides, _d) {
    FGDraw.call(this, fg, new FG_Color_Diff(), _d);
    this.visualDiff = visualDiff;
    this.inputVisualDiff = visualDiff;
    this.differentSides = differentSides;
    this.collapsed = collapsed;
    fg.g_details = function (g) {
        var attr = find_child(g, "text").attributes;
        var name = attr.name.value;
        // var samples = parseInt(attr.samples.value);
        var samples = attr.samples.value;
        var details =  name + " ([" + samples + "] samples, [";
        $.each(samples.split(","), function (i) {
            if (i > 0) {
                details = details + ",";
            }
            details = details + percentage(parseInt(this), collapsed.totalIndividualSamples[i]) + "%";
        });
        details = details + "])";
        return detailsText(escText(details), details);
    };
}

MergedFGDraw.prototype = Object.create(FGDraw.prototype);
MergedFGDraw.prototype.constructor = MergedFGDraw;

MergedFGDraw.prototype.drawTitle = function() {
    this.currentDrawnGraphTitle = "title";
    this.titles = [];

    var g = this.d.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "titleGroup");
    var height = this.fg.frameHeight * 2;
    var title  = this.text(this.fg.title, "title", this.fg.width / 2, this.buttonsMargin);
    title.setAttribute("onclick", "fg.draw.mergedGraphReload(\"title\");");
    var title1  = this.text("1st Flame Graph", "title1", this.fg.width / 2, this.buttonsMargin + height);
    title1.setAttribute("onclick", "fg.draw.mergedGraphReload(\"title1\");");
    var title2  = this.text("2nd Flame Graph", "title2", this.fg.width / 2, this.buttonsMargin + (2 * height));
    title2.setAttribute("onclick", "fg.draw.mergedGraphReload(\"title2\");");
    g.appendChild(title);
    g.appendChild(title1);
    g.appendChild(title2);
    this.titles.push(title);
    this.titles.push(title1);
    this.titles.push(title2);
    this.hideMergeGraphSelection(this.currentDrawnGraphTitle);
    return g;
};

MergedFGDraw.prototype.mergedGraphReload = function(toDraw) {
    if (toDraw === this.currentDrawnGraphTitle) {
        this.showMergeGraphSelection();
        this.currentDrawnGraphTitle = "selection";
    } else {
        this.currentDrawnGraphTitle = toDraw;
        this.hideMergeGraphSelection(toDraw);
        this.fg.reload(undefined, this.collapsedToReload(toDraw));
    }
};

MergedFGDraw.prototype.hideMergeGraphSelection = function(currentTitle) {
    var margin = this.buttonsMargin;
    var height = this.fg.frameHeight * 2;
    var i = 1;
    $.each(this.titles, function () {
        if (this.getAttribute("id") !== currentTitle) {
            this.classList.add("hide");
            this.setAttribute("y", margin + (i * height));
            i++;
        } else {
            this.setAttribute("y", margin);
        }
    });
};


MergedFGDraw.prototype.showMergeGraphSelection = function() {
    $.each(this.titles, function () {
        this.classList.remove("hide");
    });
};

MergedFGDraw.prototype.collapsedToReload = function(toDrawTitleId) {
    if (toDrawTitleId === "title1") {
        this.visualDiff = false;
        return this.collapsed.mergedComponentCollapsed(0);
    }
    if (toDrawTitleId === "title2") {
        this.visualDiff = false;
        return this.collapsed.mergedComponentCollapsed(1);
    }
    this.visualDiff = this.inputVisualDiff;
    return this.collapsed;
};

MergedFGDraw.prototype.drawFrame = function (colorScheme, f) {
    var draw = this;
    if (f.stack === ";all") {
        f.individualSamples = draw.collapsed.totalIndividualSamples;
        f.getDifferentialSamples = function (i) {
            return this.individualSamples[i];
        };
    }
    var x = f.x() + draw.fg.shiftWidth;
    var w = f.w();
    var y = f.y() + draw.fg.shiftHeight;
    var element = draw.d.createElementNS("http://www.w3.org/2000/svg", "g");
    var frameRect;
    if (draw.visualDiff) {
        frameRect = drawRect(x, y, w, function (el) {
            el.setAttribute("fill", "white");
        });

        var diff =  calculateDiff(f.individualSamples[0], draw.collapsed.totalIndividualSamples[0], f.individualSamples[1], draw.collapsed.totalIndividualSamples[1]);
        var absDiff = Math.abs(diff);
        var diffW = w * absDiff;
        if (diffW > 1) {
            var styleFunc = colorScheme.applyColor(f, draw.collapsed.totalIndividualSamples);
            var diffX = (draw.differentSides && diff < 0) ? x + w - diffW : x;
            var diffRect = drawRect(diffX, y, diffW, styleFunc);
        }
    } else {
        frameRect = drawRect(x, y, w, colorScheme.applyColor(f, draw.collapsed.totalIndividualSamples));
    }

    var textInFrame = draw.frameText(draw, f.name, w - 2, draw.fg.fontSize);
    var frameText = draw.text(textInFrame, undefined, x + 2, y + draw.fg.textPadding);
    frameText.setAttribute("orig", textInFrame);
    frameText.setAttribute("name", f.name);
    frameText.setAttribute("samples", f.individualSamples);

    element.appendChild(frameRect);
    if (diffRect) {
        element.appendChild(diffRect);
    }
    element.appendChild(frameText);

    return element;

    function drawRect(x, y, w, styleFunction) {
        var frameRect = draw.rect(x, y, w, draw.fg.frameHeight - 1, styleFunction);
        frameRect.setAttribute("rx", "2");
        frameRect.setAttribute("ry", "2");
        return frameRect;
    }
};

MergedFGDraw.prototype.frameFlyweight = function() {
    var draw = this;
    var f = FGDraw.prototype.frameFlyweight();
    f.getDifferentialSamples = function (i) {
        var samplesArray = this.e.getAttribute("samples").split(",");
        return parseInt(samplesArray[i]);
    };
    f.getTotalSamples = function () {
        return draw.collapsed.totalIndividualSamples;
    };
    return f;
};

MergedFGDraw.prototype.findDrawnRect = function(g) {
    var children = find_children(g, "rect");
    if (children.length && children[children.length - 1].getAttribute("fill") !== "white") {
            return children[children.length - 1];
    }
};

function FG_Color_Diff() {
    FG_Color.call(this);
    this.colorsAsOverlays = true;
    this.legend = {
        red: 'Growth',
        green: 'Reduction'
    };
}
FG_Color_Diff.prototype = Object.create(FG_Color.prototype);
FG_Color_Diff.prototype.constructor = FG_Color_Diff;

FG_Color_Diff.prototype.colorFor = function(frame, totalSamples) {
    var diff = calculateDiff(frame.getDifferentialSamples(0), totalSamples[0], frame.getDifferentialSamples(1), totalSamples[1]);

    if (diff === 0) {
        return "white";
    }
    if (diff < 0) {
        return "#faa";
    }
    return "#afa";
};
