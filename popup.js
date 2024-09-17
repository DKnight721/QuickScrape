// Replace these with your actual Supabase URL and Key
const supabaseUrl = "https://ihvsbgsclyozusgcqixn.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodnNiZ3NjbHlvenVzZ2NxaXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1OTE3NjcsImV4cCI6MjA0MjE2Nzc2N30.7Z5xVVCx98Udao0-fZLc2GmmzbP7uEkSVKoUS14t36o"; // Use your actual API key
const tableName = "business_listings"; // Your Supabase table name

document.addEventListener("DOMContentLoaded", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    var actionButton = document.getElementById("actionButton");
    var downloadCsvButton = document.getElementById("downloadCsvButton");
    var resultsTable = document.getElementById("resultsTable");
    var filenameInput = document.getElementById("filenameInput");

    if (
      currentTab &&
      currentTab.url.includes("://www.google.com/maps/search")
    ) {
      document.getElementById("message").textContent =
        "Let's scrape Google Maps!";
      actionButton.disabled = false;
      actionButton.classList.add("enabled");
    } else {
      var messageElement = document.getElementById("message");
      messageElement.innerHTML = "";
      var linkElement = document.createElement("a");
      linkElement.href = "https://www.google.com/maps/search/";
      linkElement.textContent = "Go to Google Maps Search.";
      linkElement.target = "_blank";
      messageElement.appendChild(linkElement);

      actionButton.style.display = "none";
      downloadCsvButton.style.display = "none";
      filenameInput.style.display = "none";
    }

    actionButton.addEventListener("click", function () {
      chrome.scripting.executeScript(
        {
          target: { tabId: currentTab.id },
          function: scrapeData,
        },
        function (results) {
          while (resultsTable.firstChild) {
            resultsTable.removeChild(resultsTable.firstChild);
          }

          // Define and add headers to the table
          const headers = [
            "title",
            "rating",
            "reviews",
            "phone",
            "industry",
            "address",
            "website",
            "google_maps_link",
          ];
          const headerRow = document.createElement("tr");
          headers.forEach((headerText) => {
            const header = document.createElement("th");
            header.textContent = headerText;
            headerRow.appendChild(header);
          });
          resultsTable.appendChild(headerRow);

          // Add new results to the table
          if (!results || !results[0] || !results[0].result) return;
          results[0].result.forEach(function (item) {
            var row = document.createElement("tr");
            [
              "title",
              "rating",
              "reviewCount",
              "phone",
              "industry",
              "address",
              "companyUrl",
              "href",
            ].forEach(function (key) {
              var cell = document.createElement("td");

              if (key === "reviewCount" && item[key]) {
                item[key] = item[key].replace(/\(|\)/g, "");
              }

              cell.textContent = item[key] || "";
              row.appendChild(cell);
            });
            resultsTable.appendChild(row);
          });

          if (
            results &&
            results[0] &&
            results[0].result &&
            results[0].result.length > 0
          ) {
            downloadCsvButton.disabled = false;
            uploadSupabase.disabled = false;
          }
        }
      );
    });

    downloadCsvButton.addEventListener("click", function () {
      var csv = tableToCsv(resultsTable);
      var filename = filenameInput.value.trim();
      if (!filename) {
        filename = "google-maps-data.csv";
      } else {
        filename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".csv";
      }
      downloadCsv(csv, filename);
    });

uploadSupabase.addEventListener("click", async function uploadData() {
  try {
    // Function to convert table data to CSV format
    function tableToCsv(table) {
      const rows = Array.from(table.querySelectorAll("tr"));
      return rows
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("td, th"));
          return cells.map((cell) => `"${cell.textContent}"`).join(",");
        })
        .join("\n");
    }

    // Function to convert CSV data to an array of objects
    const parseCsv = (csvData) => {
      const rows = csvData.split("\n").filter((row) => row.trim() !== "");
      if (rows.length < 2) return []; // Handle case with no data

      const headers = rows[0]
        .split(",")
        .map((header) => header.trim().replace(/^"|"$/g, "")); // Remove extra quotes
      return rows.slice(1).map((row) => {
        const values = row
          .split(",")
          .map((value) => value.trim().replace(/^"|"$/g, "")); // Remove extra quotes

        return headers.reduce((obj, header, index) => {
          let value = values[index] || "";

          // Handle specific data type conversions based on header
          if (header === "rating") value = parseFloat(value); // Convert to number
          obj[header] = value;
          return obj;
        }, {});
      });
    };

    // Get CSV data from the table
    const csvData = tableToCsv(resultsTable);
    console.log("CSV Data:", csvData);

    // Parse CSV data into an array of objects
    const tableData = parseCsv(csvData);
    console.log("Parsed Table Data:", tableData);

    // Check if tableData has any rows to upload
    if (tableData.length === 0) {
      console.error("No data to upload.");
      return;
    }

    // Define the URL for the Supabase table
    const url = `${supabaseUrl}/rest/v1/business_listings`;

    // Send bulk insert request to Supabase with the array of objects
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=representation", // This will return the inserted rows
      },
      body: JSON.stringify(tableData), // Bulk insert the array of objects
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse and log the response
    const result = await response.json();
    console.log("Data successfully uploaded:", result);
  } catch (error) {
    console.error("Error uploading data:", error);
  }
});


  });
});

function scrapeData() {
  var links = Array.from(
    document.querySelectorAll('a[href^="https://www.google.com/maps/place"]')
  );
  return links.map((link) => {
    var container = link.closest('[jsaction*="mouseover:pane"]');
    var titleText = container
      ? container.querySelector(".fontHeadlineSmall").textContent
      : "";
    var rating = "";
    var reviewCount = "";
    var phone = "";
    var industry = "";
    var address = "";
    var companyUrl = "";

    // Rating and Reviews
    if (container) {
      var roleImgContainer = container.querySelector('[role="img"]');

      if (roleImgContainer) {
        var ariaLabel = roleImgContainer.getAttribute("aria-label");

        if (ariaLabel && ariaLabel.includes("stars")) {
          var parts = ariaLabel.split(" ");
          var rating = parts[0];
          var reviewCount = "(" + parts[2] + ")";
        } else {
          rating = "0";
          reviewCount = "0";
        }
      }
    }

    // Address and Industry
    if (container) {
      var containerText = container.textContent || "";
      var addressRegex = /\d+ [\w\s]+(?:#\s*\d+|Suite\s*\d+|Apt\s*\d+)?/;
      var addressMatch = containerText.match(addressRegex);

      if (addressMatch) {
        address = addressMatch[0];

        // Extract industry text based on the position before the address
        var textBeforeAddress = containerText
          .substring(0, containerText.indexOf(address))
          .trim();
        var ratingIndex = textBeforeAddress.lastIndexOf(rating + reviewCount);
        if (ratingIndex !== -1) {
          // Assuming industry is the first significant text after rating and review count
          var rawIndustryText = textBeforeAddress
            .substring(ratingIndex + (rating + reviewCount).length)
            .trim()
            .split(/[\r\n]+/)[0];
          industry = rawIndustryText.replace(/[·.,#!?]/g, "").trim();
        }
        var filterRegex = /\b(Closed|Open 24 hours|24 hours)|Open\b/g;
        address = address.replace(filterRegex, "").trim();
        address = address.replace(/(\d+)(Open)/g, "$1").trim();
        address = address.replace(/(\w)(Open)/g, "$1").trim();
        address = address.replace(/(\w)(Closed)/g, "$1").trim();
      } else {
        address = "";
      }
    }

    // Company URL
    if (container) {
      var allLinks = Array.from(container.querySelectorAll("a[href]"));
      var filteredLinks = allLinks.filter(
        (a) => !a.href.startsWith("https://www.google.com/maps/place/")
      );
      if (filteredLinks.length > 0) {
        companyUrl = filteredLinks[0].href;
      }
    }

    // Phone Numbers
    if (container) {
      var containerText = container.textContent || "";
      var phoneRegex = /(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
      var phoneMatch = containerText.match(phoneRegex);
      phone = phoneMatch ? phoneMatch[0] : "";
    }

    // Return the data as an object
    return {
      title: titleText,
      rating: rating,
      reviewCount: reviewCount,
      phone: phone,
      industry: industry,
      address: address,
      companyUrl: companyUrl,
      href: link.href,
    };
  });
}

// Convert the table to a CSV string
function tableToCsv(table) {
  var csv = [];
  var rows = table.querySelectorAll("tr");

  for (var i = 0; i < rows.length; i++) {
    var row = [],
      cols = rows[i].querySelectorAll("td, th");

    for (var j = 0; j < cols.length; j++) {
      row.push('"' + cols[j].innerText + '"');
    }
    csv.push(row.join(","));
  }
  return csv.join("\n");
}

// Download the CSV file
function downloadCsv(csv, filename) {
  var csvFile;
  var downloadLink;

  csvFile = new Blob([csv], { type: "text/csv" });
  downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
}
