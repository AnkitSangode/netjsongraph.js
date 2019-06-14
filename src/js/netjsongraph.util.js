"use strict";

class NetJSONGraphUtil {
  /**
   * @function
   * @name JSONParamParse
   *
   * Perform different operations to call NetJSONDataParse function according to different Param types.
   * @param  {object|string}  JSONParam   Url or JSONData
   *
   * @return {object}    A promise object of JSONData
   */

  JSONParamParse(JSONParam) {
    if (typeof JSONParam === "string") {
      return fetch(JSONParam, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      })
        .then(response => {
          if (response.json) {
            return response.json();
          } else {
            return response;
          }
        })
        .catch(msg => {
          console.error(msg);
        });
    } else {
      return Promise.resolve(JSONParam);
    }
  }

  /**
   * @function
   * @name dateParse
   *
   * Parse the time in the browser's current time zone based on the incoming matching rules.
   * The exec result must be [date, year, month, day, hour, minute, second, millisecond?]
   *
   * @param  {string}          dateString
   * @param  {object(RegExp)}  parseRegular
   * @param  {number}          hourDiffer    you can custom time difference, default is the standard time difference

   *
   * @return {string}    Date string
   */

  dateParse({
    dateString,
    parseRegular = /^([1-9]\d{3})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?Z$/,
    hourDiffer = new Date().getTimezoneOffset() / 60
  }) {
    const dateParseArr = parseRegular.exec(dateString);
    if (!dateParseArr || dateParseArr.length < 7) {
      console.error("Date doesn't meet the specifications.");
      return "";
    }
    const dateNumerFields = ["dateYear", "dateMonth", "dateDay", "dateHour"],
      dateNumberObject = {},
      leapYear =
        (dateParseArr[1] % 4 === 0 && dateParseArr[1] % 100 !== 0) ||
        dateParseArr[1] % 400 === 0,
      limitBoundaries = new Map([
        ["dateMonth", 12],
        [
          "dateDay",
          [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        ],
        ["dateHour", 24]
      ]);

    for (let i = dateNumerFields.length; i > 0; i--) {
      dateNumberObject[dateNumerFields[i - 1]] = parseInt(dateParseArr[i], 10);
    }

    let carry = -hourDiffer,
      limitBoundary;
    for (let i = dateNumerFields.length; i > 0; i--) {
      if (dateNumerFields[i - 1] === "dateYear") {
        dateNumberObject[dateNumerFields[i - 1]] += carry;
        break;
      } else if (dateNumerFields[i - 1] === "dateDay") {
        limitBoundary = limitBoundaries.get("dateDay")[
          dateNumberObject["dateMonth"] - 1
        ];
      } else {
        limitBoundary = limitBoundaries.get(dateNumerFields[i - 1]);
      }

      let calculateResult = dateNumberObject[dateNumerFields[i - 1]] + carry;

      if (dateNumerFields[i - 1] === "dateHour") {
        carry =
          calculateResult < 0 ? -1 : calculateResult >= limitBoundary ? 1 : 0;
      } else {
        carry =
          calculateResult <= 0 ? -1 : calculateResult > limitBoundary ? 1 : 0;
      }

      if (carry === 1) {
        calculateResult -= limitBoundary;
      } else if (carry < 0) {
        if (dateNumerFields[i - 1] === "dateDay") {
          limitBoundary = limitBoundaries.get("dateDay")[
            (dateNumberObject[dateNumerFields[i - 1]] + 10) % 11
          ];
        }
        calculateResult += limitBoundary;
      }

      dateNumberObject[dateNumerFields[i - 1]] = calculateResult;
    }

    return (
      dateNumberObject["dateYear"] +
      "." +
      this.numberMinDigit(dateNumberObject["dateMonth"]) +
      "." +
      this.numberMinDigit(dateNumberObject["dateDay"]) +
      " " +
      this.numberMinDigit(dateNumberObject["dateHour"]) +
      ":" +
      this.numberMinDigit(dateParseArr[5]) +
      ":" +
      this.numberMinDigit(dateParseArr[6]) +
      (dateParseArr[7] ? "." + this.numberMinDigit(dateParseArr[7], 3) : "")
    );
  }

  /**
   * Guaranteed minimum number of digits
   *
   * @param  {number}      number
   * @param  {number}      digit      min digit
   * @param  {string}      filler
   *
   * @return {string}
   */
  numberMinDigit(number, digit = 2, filler = "0") {
    return (Array(digit).join(filler) + number).slice(-digit);
  }

  /**
   * @function
   * @name NetJSONMetadata
   * Display metadata of NetJSONGraph.
   *
   * @param  {object}  metadata
   *
   * @return {object} metadataContainer DOM
   */

  NetJSONMetadata(metadata) {
    const attrs = [
      "protocol",
      "version",
      "revision",
      "metric",
      "router_id",
      "topology_id"
    ];
    let html = "";

    if (metadata.label) {
      html += "<h3>" + metadata.label + "</h3>";
    }
    for (var i in attrs) {
      var attr = attrs[i];
      if (metadata[attr]) {
        html +=
          "<p><b>" + attr + "</b>: <span>" + metadata[attr] + "</span></p>";
      }
    }
    html +=
      "<p><b>nodes</b>: <span id='metadataNodesLength'>" +
      metadata.nodes.length +
      "</span></p>";
    html +=
      "<p><b>links</b>: <span id='metadataLinksLength'>" +
      metadata.links.length +
      "</span></p>";

    const metadataContainer = document.createElement("div"),
      innerDiv = document.createElement("div"),
      closeA = document.createElement("a");
    metadataContainer.setAttribute("class", "njg-metadata");
    metadataContainer.setAttribute("style", "display: block");
    innerDiv.setAttribute("class", "njg-inner");
    closeA.setAttribute("class", "njg-close");
    closeA.setAttribute("id", "metadata-close");

    closeA.onclick = () => {
      metadataContainer.style.visibility = "hidden";
    };
    innerDiv.innerHTML = html;
    metadataContainer.appendChild(innerDiv);
    metadataContainer.appendChild(closeA);

    return metadataContainer;
  }

  /**
   * @function
   * @name nodeInfo
   *
   * Parse the infomation of incoming node data.
   * @param  {object}    node
   *
   * @return {string}    html dom string
   */

  nodeInfo(node) {
    let html = `<p><b>id</b>: ${node.id}</p>\n`;
    if (node.label) {
      html += "<p><b>label</b>: " + node.label + "</p>\n";
    }
    if (node.properties) {
      for (let key in node.properties) {
        html +=
          "<p><b>" +
          key.replace(/_/g, " ") +
          "</b>: " +
          node.properties[key] +
          "</p>\n";
      }
    }
    if (node.linkCount) {
      html += "<p><b>links</b>: " + node.linkCount + "</p>\n";
    }
    if (node.local_addresses) {
      html +=
        "<p><b>local addresses</b>:<br/>" +
        node.local_addresses.join("<br/>") +
        "</p>\n";
    }

    return html;
  }

  /**
   * @function
   * @name linkInfo
   *
   * Parse the infomation of incoming link data.
   * @param  {object}    link
   *
   * @return {string}    html dom string
   */

  linkInfo(link) {
    let html = `<p><b>source</b>: ${link.source}</p>\n<p><b>target</b>: ${
      link.target
    }</p>\n<p><b>cost</b>: ${link.cost}</p>\n`;
    if (link.properties) {
      for (let key in link.properties) {
        html +=
          "<p><b>" +
          key.replace(/_/g, " ") +
          "</b>: " +
          link.properties[key] +
          "</p>\n";
      }
    }

    return html;
  }
}

export default NetJSONGraphUtil;