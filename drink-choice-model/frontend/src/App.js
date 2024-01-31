import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BatchControls from "./Components/BatchControls";
import "./styles.css"; 




const App = () => {
  const apiKey = "9307bfd5fa011428ff198bb37547f979";
  const modelId = "58d3bcf97c6b1644db73ad12";
  const [metadata, setMetadata] = useState([]);
  const [decision, setDecision] = useState("");
  const [inputVariables, setInputVariables] = useState({});
  const [triggeredExclusionRule, setTriggeredExclusionRule] = useState(null);
  const [batchFileId, setBatchFileId] = useState("");
  const [mongoData, setMongoData] = useState([]);


  


  useEffect(() => {
    const fetchData = async () => {
      
      try {
        const metadataResponse = await fetch(
          `https://api.up2tom.com/v3/models/${modelId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Token ${apiKey}`,
              "Content-Type": "application/vnd.api+json",
            },
          }
        );

        if (!metadataResponse.ok) {
          throw new Error(
            `Metadata HTTP error! Status: ${metadataResponse.status}`
          );
        }

        const metadataData = await metadataResponse.json();

        if (metadataData?.data?.attributes?.metadata?.attributes) {
          const inputVariables = {};

          Object.entries(
            metadataData.data.attributes.metadata.attributes
          ).forEach(([key, variable]) => {
            inputVariables[key] = variable.type === "Continuous" ? 0 : "";
          });

          setMetadata(metadataData.data.attributes.metadata.attributes);
          setInputVariables(inputVariables);
        } else {
          console.error("Error: Metadata is not in the expected format.");
        }
      } catch (error) {
        console.error("Error:", error.message);
      }
    };

    fetchData();
  }, [apiKey, modelId]);



  const fetchMongoData = async () => {
    try {
      const response = await fetch('http://localhost:3001/getdecisions'); 
      const data = await response.json();
  
      if (data.success) {
        setMongoData(data.decisions);
      } else {
        console.error('Failed to fetch data:', data.message);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  };
  
  useEffect(() => {
    fetchMongoData();
  }, []); // Fetch data on component mount

  const checkRelation = (condition, inputValue) => {
    switch (condition.type) {
      case "EQ":
        return inputValue === condition.threshold;
      case "NEQ":
        return inputValue !== condition.threshold;
      case "LTEQ":
        return inputValue <= condition.threshold;
      case "GT":
        return inputValue > condition.threshold;
      default:
        return false;
    }
  };

  const handleRelation = (relation, inputVariables) => {
    try {
      const leftOperand = inputVariables[relation.index];
      const rightOperand = relation.threshold;

      switch (relation.type) {
        case "LTEQ":
          return leftOperand <= rightOperand;
        case "GT":
          return leftOperand > rightOperand;
        case "EQ":
          return leftOperand === rightOperand;
        case "NEQ":
          return leftOperand !== rightOperand;
        default:
          return false;
      }
    } catch (error) {
      console.error("Error handling Relation:", error.message);
      return false;
    }
  };

  const handleResult = (result) => {
    // Implement logic to handle Results
    // For example, set the decision to the value stored in the result
    setDecision(result.value);
  };

  const handleValueExclusion = (valueExclusion, inputVariables) => {
    try {
      const antecedentSatisfied = valueExclusion.antecedent.every(
        (condition) => {
          return checkRelation(condition, inputVariables[condition.index]);
        }
      );

      const consequentSatisfied = valueExclusion.consequent.every(
        (condition) => {
          return checkRelation(condition, inputVariables[condition.index]);
        }
      );

      return antecedentSatisfied && consequentSatisfied;
    } catch (error) {
      console.error("Error handling Value Exclusion:", error.message);
      return false;
    }
  };

  const handleRelationshipExclusion = (
    relationshipExclusion,
    inputVariables
  ) => {
    try {
      const relationSatisfied = checkRelation(
        relationshipExclusion.relation,
        inputVariables[relationshipExclusion.relation.index]
      );
      return relationSatisfied;
    } catch (error) {
      console.error("Error handling Relationship Exclusion:", error.message);
      return false;
    }
  };

  const handleBlatantExclusion = (blatantExclusion, inputVariables) => {
    try {
      const antecedentSatisfied = checkRelation(
        blatantExclusion.antecedent,
        inputVariables[blatantExclusion.antecedent.index]
      );

      if (antecedentSatisfied) {
        handleResult(blatantExclusion.consequent);
      }

      return antecedentSatisfied;
    } catch (error) {
      console.error("Error handling Blatant Exclusion:", error.message);
      return false;
    }
  };

  const checkExclusionRule = (rule, inputVariables) => {
    try {
      if (rule.type === "BlatantEx" && rule.antecedent && rule.consequent) {
        return handleBlatantExclusion(rule, inputVariables);
      } else if (
        rule.type === "ValueEx" &&
        rule.antecedent &&
        rule.consequent
      ) {
        return handleValueExclusion(rule, inputVariables);
      } else if (rule.type === "RelationshipEx" && rule.relation) {
        const relationSatisfied = handleRelation(rule.relation, inputVariables);
        return relationSatisfied;
      }
  
      return false;
    } catch (error) {
      console.error("Error:", error.message);
      return false;
    }
  };

  const handleInputChange = (variableName, value) => {
    const variable = metadata.find((v) => v.name === variableName);

    if (!variable) {
      console.error(`Variable ${variableName} not found in metadata.`);
      return;
    }
    if (variableName === "INPUTVAR2") {
      // If the variable is "INPUTVAR2" (gender), update the value and set "INPUTVAR6" accordingly
      setInputVariables((prevInputVariables) => ({
        ...prevInputVariables,
        [variableName]: value,
        INPUTVAR6: value === "Male" ? "NA" : prevInputVariables.INPUTVAR6||'',
      }));
    } else {
    if (variable.type === "Continuous") {
      const inputValue = parseFloat(value);

      if (
        !isNaN(inputValue) &&
        inputValue >= variable.domain.lower &&
        inputValue <= variable.domain.upper
      ) {
        setInputVariables((prevInputVariables) => ({
          ...prevInputVariables,
          [variableName]: inputValue,
        }));
      } else {
        setInputVariables((prevInputVariables) => ({
          ...prevInputVariables,
          [variableName]: "",
        }));

        toast.error(
          `Invalid input for ${variableName}. Must be a number between ${variable.domain.lower} and ${variable.domain.upper}.`
        );
      }
    } else {
      if (variable.domain.values.includes(value)) {
        setInputVariables((prevInputVariables) => ({
          ...prevInputVariables,
          [variableName]: value,
        }));
      } else {
        setInputVariables((prevInputVariables) => ({
          ...prevInputVariables,
          [variableName]: "",
        }));

        toast.error(
          `Invalid input for ${
            variable.name
          }. Must be one of [${variable.domain.values.join(", ")}].`
          );
        }
      }
    }
  };
  // Function to handle batch file upload
  const handleBatchUpload = async (batchFile) => {
    try {
      const data = new FormData();
      data.append("file", batchFile);
      data.append("delimiter", ",");

      const response = await fetch(
        `https://api.up2tom.com/v3/batch/${modelId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          body: data,
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`Batch Upload Error: ${responseData.message}`);
      }

      // Handle the response data if needed
      console.log("Batch Upload Response:", responseData);
      toast.success("Batch file uploaded successfully!");
    } catch (error) {
      console.error("Batch Upload Error:", error.message);
      toast.error("Error uploading batch file. Please try again.");
    }
  };

  const downloadBatchFile = async (batchFileId) => {
    try {
      const response = await fetch(
        `https://api.up2tom.com/v3/batch/${modelId}/${batchFileId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download Batch File Error: ${response.statusText}`);
      }

      // Convert the response to a blob
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "batch_result.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download Batch File Error:", error.message);
      toast.error("Error downloading batch file. Please try again.");
    }
  };

  // Function to retrieve processed batch file
  const retrieveProcessedBatchFile = async (batchFileId) => {
    try {
      const response = await fetch(
        `https://api.up2tom.com/v3/batch/${modelId}/${batchFileId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Retrieve Batch File Error: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");

      // Check if the response is a JSON API response
      if (contentType && contentType.includes("application/vnd.api+json")) {
        // Handle JSON API response (you can parse and use the data if needed)
        const jsonData = await response.json();
        console.log("JSON API Response:", jsonData);
        toast.warning(
          "Retrieved data is in JSON format. No download initiated."
        );
      } else if (contentType && contentType.includes("text/csv")) {
        // Create a Blob from the response data
        const blob = await response.blob();

        // Create a download link and trigger the download
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "batch_result.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Handle other content types if needed
        console.error("Unsupported content type:", contentType);
        toast.error("Error retrieving batch file. Unsupported content type.");
      }
    } catch (error) {
      console.error("Retrieve Batch File Error:", error.message);
      toast.error("Error retrieving batch file. Please try again.");
    }
  };
  const deleteBatchFile = async (batchFileId) => {
    try {
      const response = await fetch(
        `https://api.up2tom.com/v3/batch/${modelId}/${batchFileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Delete Batch File Error: ${response.statusText}`);
      }

      toast.success("Batch file deleted successfully!");
    } catch (error) {
      console.error("Delete Batch File Error:", error.message);
      toast.error("Error deleting batch file. Please try again.");
    }
  };

  const handleSendRequest = async () => {
    try {
      const missingVariables = metadata
        .filter((variable) => !inputVariables.hasOwnProperty(variable.name))
        .map((variable) => variable.name);
  
      const completeInputVariables = missingVariables.reduce(
        (acc, variable) => {
          acc[variable] = inputVariables[variable] || "";
          return acc;
        },
        { ...inputVariables }
      );

      const domainErrors = [];
      metadata.forEach((variable) => {
        const inputValue = completeInputVariables[variable.name];
        if (
          inputValue &&
          variable.domain &&
          variable.domain.type === "DomainC" &&
          !variable.domain.values.includes(inputValue)
        ) {
          domainErrors.push(
            `${variable.name} must be one of [${variable.domain.values.join(
              ", "
            )}]`
          );
        }
      });

      if (domainErrors.length > 0) {
        throw new Error(`Domain errors: ${domainErrors.join(", ")}`);
      }

      const requestBody = {
        data: {
          type: "scenario",
          attributes: {
            input: completeInputVariables,
          },
        },
      };


     const decisionResponse = await fetch(
        `https://api.up2tom.com/v3/decision/${modelId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );
   

    const decisionData = await decisionResponse.json();

    console.log('Decision Data:', decisionData);

    const externalDecision = decisionData.data?.attributes?.decision;
    const backendResponse = await fetch(
      'http://localhost:3001/api/submitdecision',
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ externalDecision }),
      }
    );
    
    const backendData = await backendResponse.json();

      if (!decisionResponse.ok) {
        // Handle error response
        if (decisionData.errors && decisionData.errors.length > 0) {
          const error = decisionData.errors[0];
          console.error(
            `Decision Error: ${error.title}. Detail: ${error.detail}`
          );

          // Check if the error is due to an infeasible scenario
          if (
            error.title === "Infeasible Scenario" &&
            error.rules &&
            error.rules.length > 0
          ) {
            const violatedRules = error.rules;
            console.log("Violated Rules:", violatedRules);

            // Handle the violated rules (e.g., display an alert)
            // You can also update the state or take other actions based on the violated rules
          }
        }

        throw new Error(
          `Decision HTTP error! Status: ${decisionResponse.status}`
        );
      }

      const decisionOutput = decisionData.data?.attributes?.decision;
      setDecision(decisionOutput);

      const exclusions = decisionData.data?.attributes?.exclusions?.rules;

      if (exclusions && exclusions.length > 0) {
        exclusions.forEach((rule) => {
          const isRuleTriggered = checkExclusionRule(
            rule,
            completeInputVariables
          );
          if (isRuleTriggered) {
            console.log(`Exclusion Rule Triggered: ${JSON.stringify(rule)}`);
            setTriggeredExclusionRule(rule);
          }
        });
      }

      return false;
    } catch (error) {
      console.error("Error:", error.message);
    }
  };


return (
  <div className="container">
    <h1 className="title">Drink Choice Model</h1>

    <h2 className="section-title">Enter Details</h2>
    {metadata.map((variable) => (
      <div key={variable.name} className="mb-4">
        <label className="input-label">
          {variable.question}:
          {variable.type === "Continuous" ? (
            <input
              type="text"
              value={inputVariables[variable.name] ?? ""}
              onChange={(e) =>
                handleInputChange(variable.name, e.target.value)
              }
              className="input-field"
            />
          ) : (
            <select
              value={
                inputVariables[variable.name] !== ""
                  ? inputVariables[variable.name]
                  : undefined
              }
              onChange={(e) =>
                handleInputChange(variable.name, e.target.value)
              }
              className="input-field"
            >
              <option value={undefined}>Select...</option>
              {variable.domain.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
    ))}

    <button
      onClick={handleSendRequest}
      className="button"
    >
      Send Request
    </button>

    <h1 className="section-title mt-8">Model Decision</h1>
    <p className="result">{decision}</p>

    {triggeredExclusionRule && (
      <div className="exclusion-message">
        Exclusion Rule Triggered: {JSON.stringify(triggeredExclusionRule)}
      </div>
    )}
    {/* Add BatchControls component with onBatchUpload prop */}
    <BatchControls onBatchUpload={handleBatchUpload} />

    {/* Button to retrieve processed batch file */}
    <button
      onClick={() => retrieveProcessedBatchFile(batchFileId)}
      className="button batch-buttons"
    >
      Retrieve Processed Batch File
    </button>

    <button
      onClick={() => downloadBatchFile(batchFileId)}
      className="button batch-buttons"
    >
      Download Batch File
    </button>
    <h1 className="section-title mt-8">MongoDB Data</h1>
    <table>
      <thead>
        <tr>
          {/* Add table headers if needed */}
        </tr>
      </thead>
      <tbody>
        {mongoData.map((decision) => (
          <tr key={decision._id}>
            <td>{decision.externalDecision}</td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Toast notifications container */}
    <ToastContainer />
  </div>
);

};

export default App;


