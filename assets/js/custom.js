---
# Do not delete this line.
---
 opensdg.dataRounding = function(value, context) {
 function countDigitsBeforeDecimal(number) {
  // Convert the number to a string
  var numberString = number.toString();
  
  // Find the position of the decimal point
  var decimalPosition = numberString.indexOf('.');
  
  // Extract the digits before the decimal point
  var digitsBeforeDecimal = numberString.slice(0, decimalPosition);
  
  // Count the number of digits
  var numDigits = digitsBeforeDecimal.length;
 
  // Round to whole number
 if (numDigits >= 4) 
  return Number(value.toPrecision(numDigits)
       }
                }            
    
    // Otherwise round to 3 SF.
    else {
        return Number(value.toPrecision(3))
    }
}

}
    
