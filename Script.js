// DOM Elements
        const display = document.getElementById("display");
        const totalDisplay = document.getElementById("totalDisplay");
        const structuredOutput = document.getElementById("structuredOutput");
        const equalBtn = document.getElementById("equalBtn");
        const modal = document.getElementById("modal");
        const modalContent = document.getElementById("modalContent");

        const redColor = '#ff4d4d'; 
        const greenColor = '#41dc8e';

        // State Variables
        let currentCalc = null;
        let savedCalculations = [];
        let fullLedger = "";
        let tempExpression = "";
        let singleValueMode = false;

        // NEW: Variable to track if data is saved
        let isDataSaved = false;

        // NEW: Correction function (requirement 1)
        function correction() {
            if (display.value.length > 0) {
                display.value = display.value.slice(0, -1);
            }
        }

        // Calculator Functions
        function append(value) {
            if (equalBtn.disabled) return;
            display.value += value;
        }

        function clearAll() {
            display.value = "";
            totalDisplay.innerHTML = "";
            structuredOutput.innerHTML = "";
            fullLedger = "";
            equalBtn.disabled = false;
            currentCalc = null;
            isDataSaved = false; // NEW: Reset save flag
            result1 = 0;
        }

        function calculate() {

            if (
                !display.value ||                          // empty
                !/[+\-*/]/.test(display.value) ||          // no operator at all
                /^[+\-*/]/.test(display.value) ||          // starts with operator
                /[+\-*/]$/.test(display.value) ||          // ends with operator
                /[+\-*/]{2,}/.test(display.value)          // two operators together
            ) {
                showNotification("Please enter a valid calculation", redColor);
                return;
            }

            tempExpression = display.value;

            // Check if it's a single number or expression
            if (!/[+\-*/]/.test(tempExpression)) {
                singleValueMode = true;
                openDescriptionModal([tempExpression]);
                return;
            }

            singleValueMode = false;
            const tokens = tempExpression.split(/([+\-*/])/);
            const numbers = tokens.filter(token => !isNaN(token) && token !== "");
            const operator1 = tokens.filter(token => isNaN(token) && token !== "");//KK
            openDescriptionModal(numbers,operator1);
        }

        // Modal Functions
        function openDescriptionModal(numbers,operator1) {
            modal.style.display = "flex";

            let html = `
                <h3>${singleValueMode ? 'Enter Value Details' : 'Enter Calculation Details'}</h3>
                <div id="descInputs"></div>
            `;

            if (!singleValueMode) {
                html += `
                    <label><strong>Result Description:</strong></label>
                    <input type="text" id="resultDesc" placeholder="e.g., Total Amount" style="width:100%; margin-bottom:15px;">
                `;
            }

            html += `
                <label><strong>Transaction Date (DD-MM-YYYY):</strong></label>
                <input type="date" id="transactionDate" placeholder="DD-MM-YYYY" style="width:100%; margin-bottom:20px;">
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="submitDetails()" style="flex: 1;">Confirm</button>
                    <button onclick="closeModal()" style="flex: 1; background: #6c757d;">Cancel</button>
                </div>
            `;

            modalContent.innerHTML = html;

            const descInputs = document.getElementById("descInputs");
            numbers.forEach((num, index) => {
                descInputs.innerHTML += `
                    <label><strong>Value ${index + 1} (${num} ${operator1[index] === undefined ? '=' : operator1[index]}) Description:</strong></label>
                    <input type="text" id="desc_${index}" placeholder="Enter description for ${num}" style="width:100%; margin-bottom:15px;">
                `;
            });
        }

        // MODIFIED: submitDetails now only shows on structuredOutput, doesn't save (requirement 3)
        function submitDetails() {
            const tokens = tempExpression.split(/([+\-*/])/);
            let descIndex = 0;
            const values = [];

            tokens.forEach(token => {
                if (!isNaN(token) && token !== "") {
                    const desc = document.getElementById("desc_" + descIndex).value || "No description";
                    values.push({ number: token, description: desc });
                    descIndex++;
                }
            });

            const transactionDate = document.getElementById("transactionDate").value || "Not specified";
            const currentDate = new Date().toLocaleDateString('en-GB');

            let result;
            let resultDesc;
            
            if (singleValueMode) {
                result = tempExpression;
                resultDesc = values[0]?.description || "No description";
            } else {
                try {
                    // Calculate step by step in the order entered (left to right)
                    
                    let stepResult = parseFloat(tokens[0]);
                    
                    for (let i = 1; i < tokens.length; i += 2) {
                        const operator = tokens[i];
                        const nextNumber = parseFloat(tokens[i + 1]);

                        switch (operator) {
                            case "+": stepResult += nextNumber; break;
                            case "-": stepResult -= nextNumber; break;
                            case "*": stepResult *= nextNumber; break;
                            // case "/": stepResult /= nextNumber; break;
                            case "/": if (nextNumber === 0) {
                                        showNotification("Cannot divide by zero", redColor);
                                        closeModal();
                                        return;
                                    } stepResult /= nextNumber; break;
                        }
                    }
                    
                    result = Math.round(stepResult);
                    
                } catch (error) {
                    // alert("Invalid calculation");
                    showNotification("Invalid calculation", redColor);
                    return;
                }

                resultDesc = document.getElementById("resultDesc")?.value || "No description";

            }

            currentCalc = {
                expression: tempExpression,
                values,
                result,
                resultDescription: resultDesc,
                transactionDate, // Store transaction date
                currentDate      // Store current date
            };

            totalDisplay.innerHTML = `${tempExpression} = ${result}`;
            
            // Clear previous structured output and show new one (only shows on confirm)
            structuredOutput.innerHTML = "";
            renderStructured(currentCalc);

            // REMOVED: Automatic saving to savedCalculations
            // Data will only save when save button is clicked
            
            closeModal();
            equalBtn.disabled = true;
            isDataSaved = false; // NEW: Reset save flag when new calculation is made
        }

        function renderStructured(calc) {
            let html = "";
            const tokens = calc.expression.split(/([+\-*/])/);
            
            // First number
            let stepResult = parseFloat(tokens[0]);
            let firstDesc = calc.values[0]?.description || "Unknown";
            let valueIndex = 1;

            for (let i = 1; i < tokens.length; i += 2) {
                const operator = tokens[i];
                const nextNumber = parseFloat(tokens[i + 1]);
                const nextDesc = calc.values[valueIndex]?.description || "Unknown";
                const previousResult = stepResult;

                // Perform operation in sequential order (left to right)
                switch (operator) {
                    case "+": stepResult += nextNumber; break;
                    case "-": stepResult -= nextNumber; break;
                    case "*": stepResult *= nextNumber; break;
                    // case "/": stepResult /= nextNumber; break;
                    case "/": if (nextNumber === 0) {
                                        showNotification("Cannot divide by zero", redColor);
                                        closeModal();
                                        return;
                                    } stepResult /= nextNumber; break;
                }

                stepResult = Math.round(stepResult);

                html += `
                    <div>
                        <strong>${previousResult}</strong> (${firstDesc})
                        ${operator === "*" ? "×" : operator === "/" ? "÷" : operator}
                        <strong>${nextNumber}</strong> (${nextDesc})
                        = <strong>${stepResult}</strong> (${i + 2 >= tokens.length ? calc.resultDescription : "Total"})
                    </div>
                `;

                // firstDesc = calc.resultDescription;
                firstDesc = i + 2 >= tokens.length ? calc.resultDescription : "Total";
                valueIndex++;
            }

            // Store the complete calculation
            structuredOutput.innerHTML = html;
            fullLedger = html;
        }

        // MODIFIED: useResult now adds to previous structuredOutput (requirement 5)
        function useResult() {
            // if (!currentCalc) {
            //     // alert("No result available! Please calculate something first.");
            //     showNotification("No result available! Please calculate something first.", redColor);
            //     return;
            // }

            if (!result1) {
                // alert("No result available! Please calculate something first.");
                showNotification("No result available! Please calculate something first.", redColor);
                return;
            }
            
            // Add result to display for next calculation
            display.value = result1;
            totalDisplay.innerHTML = "";
            equalBtn.disabled = false;
            
            // NEW: structuredOutput remains visible with previous calculation
            // No change to structuredOutput or saving
        }

        // NEW: Save structured data function (requirement 4)
        let result1 = 0;
        function saveStructuredData() {
            
            if (!currentCalc) {
                // alert("No calculation to save! Please calculate something first.");
                showNotification("No calculation to save! Please calculate something first.", redColor);
                return;
            }

            if (isDataSaved) {
                // alert("This calculation is already saved!");
                showNotification("This calculation is already saved!", redColor);
                return;
            }

            // Save the current calculation
            savedCalculations.push({
                result: currentCalc.result,
                ledger: fullLedger,
                transactionDate: currentCalc.transactionDate || "Not specified",
                currentDate: currentCalc.currentDate || new Date().toLocaleDateString('en-GB'),
                expression: currentCalc.expression,
                values: currentCalc.values,
                resultDescription: currentCalc.resultDescription
            });

            isDataSaved = true;
            // alert("Calculation saved successfully!");
            showNotification("Calculation saved successfully!", greenColor);
            structuredOutput.innerHTML = "";
            result1 = currentCalc.result;
            currentCalc = null;//kk

            // console.log("Saved calculation - Result:", currentCalc.result);
        }

        // MODIFIED: openSavedScreen remains same but works with savedCalculations
        function openSavedScreen() {
            if (savedCalculations.length === 0) {
                // alert("No saved results available!");
                showNotification("No saved results available!", greenColor);
                return;
            }

            // Sort by transaction date (newest first)
            savedCalculations.sort((a, b) => {
                // Handle "Not specified" dates
                if (a.transactionDate === "Not specified") return 1;
                if (b.transactionDate === "Not specified") return -1;
                
                const [aDay, aMonth, aYear] = a.transactionDate.split("-").map(Number);
                const [bDay, bMonth, bYear] = b.transactionDate.split("-").map(Number);
                const dateA = new Date(aYear, aMonth - 1, aDay);
                const dateB = new Date(bYear, bMonth - 1, bDay);
                return dateB - dateA;
            });

            modal.style.display = "flex";

            let html = `
                <h3>📁 Saved Results</h3>
                <hr>
            `;

            savedCalculations.forEach((calc, index) => {
                html += `
                    <div style="padding: 12px; border-bottom: 1px solid #dee2e6; cursor: pointer; transition: background 0.3s;"
                        onmouseover="this.style.background='#f8f9fa'"
                        onmouseout="this.style.background='transparent'"
                        onclick="openDetail(${index})">
                        <strong>Result: ${calc.result}</strong><br>
                        <small style="color: #6c757d;">📅 ${calc.transactionDate}</small>
                    </div>
                `;
            });

            html += `
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="closeModal()">Close</button>
                </div>
            `;

            modalContent.innerHTML = html;
        }

        // MODIFIED: openDetail now includes delete button (requirement 6)
        function openDetail(index) {
            const calc = savedCalculations[index];
            
            // Clean the ledger HTML for text sharing
            const cleanLedger = calc.ledger.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

            const shareText = `
    📊 Calculation Details
    ══════════════════════
    📅 Transaction Date: ${calc.transactionDate}
    💾 Saved Date: ${calc.currentDate}
    ══════════════════════
    ${cleanLedger}
    ══════════════════════
    Final Result: ${calc.result}
            `;

            const html = `
                <h3>📊 Calculation Details</h3>
                <p><strong>📅 Transaction Date:</strong> ${calc.transactionDate}</p>
                <p><strong>💾 Saved Date:</strong> ${calc.currentDate}</p>
                <p><strong>🔢 Expression:</strong> ${calc.expression}</p>
                <hr>
                <div style="max-height: 300px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 10px; font-family: monospace;">
                    ${calc.ledger}
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 10px; text-align: center;">
                    <strong>Final Result: ${calc.result}</strong> (${calc.resultDescription})
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                    <button onclick="shareCalculation(\`${shareText}\`)" style="flex: 1;">📤 Share</button>
                    <!-- NEW: Delete button added -->
                    <button class="delete-btn" onclick="deleteCalculation(${index})" style="flex: 1;">🗑️ Delete</button>
                    <button onclick="openSavedScreen()" style="flex: 1; background: #6c757d;">Close</button>
                </div>
            `;

            modalContent.innerHTML = html;
        }

        // NEW: Delete calculation function (requirement 6)
        // function deleteCalculation(index) {
        //     if (confirm("Are you sure you want to delete this calculation?")) {
        //         savedCalculations.splice(index, 1);
        //         closeModal();
        //         // Show updated saved list
        //         if (savedCalculations.length > 0) {
        //             openSavedScreen();
        //         } else {
        //             // alert("No saved calculations remaining.");
        //             showNotification("No saved calculations remaining.", redColor);
        //         }
        //     }
        // }
        function deleteCalculation(index) {
            const popup = document.getElementById("confirmPopup");
            const yesBtn = document.getElementById("confirmYes");
            const noBtn = document.getElementById("confirmNo");

            popup.style.display = "flex";

            // YES button
            yesBtn.onclick = function () {
                savedCalculations.splice(index, 1);
                popup.style.display = "none";
                closeModal();

                if (savedCalculations.length > 0) {
                    openSavedScreen();
                } else {
                    showNotification("No saved calculations remaining.", redColor);
                }
            };

            // NO button
            noBtn.onclick = function () {
                popup.style.display = "none";
            };
        }

        function shareCalculation(text) {
            if (navigator.share) {
                navigator.share({
                    title: "Calculation Details",
                    text: text
                }).catch(() => {
                    // alert("Share cancelled");
                    showNotification("Share cancelled", greenColor);
                });
            } else {
                // Fallback for browsers that don't support sharing
                navigator.clipboard.writeText(text).then(() => {
                    // alert("Details copied to clipboard!");
                    showNotification("Details copied to clipboard!", greenColor);
                }).catch(() => {
                    // alert("Sharing not supported on this device");
                    showNotification("Sharing not supported on this device", redColor);
                });
            }
        }

        function closeModal() {
            modal.style.display = "none";
        }

        // Clear any old saved calculations that might be causing issues
        function resetSavedCalculations() {
            savedCalculations = [];
            // console.log("Saved calculations reset");
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (modal.style.display === 'flex') return;

            const key = e.key;
            if (!isNaN(key) || ['+', '-', '*', '/', '.', 'Enter', 'Escape', 'Backspace'].includes(key)) {
                e.preventDefault();

                if (key === 'Enter') {
                    calculate();
                } else if (key === 'Escape') {
                    clearAll();
                } else if (key === 'Backspace') {
                    correction(); // Use correction function for backspace
                } else {
                    append(key);
                }
            }
        });

        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target === modal) {
                closeModal();
            }
        };

        function showNotification(message, color) {
            const notify = document.getElementById("notify");
            notify.textContent = message;

            notify.classList.add("show");
            notify.style.backgroundColor = color;

            setTimeout(() => {
                notify.classList.remove("show");
            }, 1000); // hides after 2.5 sec
        }