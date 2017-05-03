require 'csv'

status = true

# Add an is_float method to the string
class String
  def is_float?
    true if Float(self) rescue false
  end
end

csvs = Dir.glob("data/indicator*.csv")

csvs.each do |csv|
  
  dat = CSV.read(csv, :headers => true)
  # you can get the headers so now you can error if they're wrong

  unless dat.headers[0] == "Year"
    status = false
    STDERR.puts "First column not called \"Year\" in #{csv}"
  end
  
  unless dat.headers[-1] == "Value"
    status = false
    STDERR.puts "Last column not called \"Value\" in #{csv}"
  end
  
  # Now get the value column
  val = dat.map{|x| x[-1]}  
  # Check that they're not all missing
  #allmissing = val.map{|x| x.nil?}.all?
  #puts "All missing: #{allmissing}"
  
  # Check that value is numeric (or nil)
  num = val.map{|x| if x.nil? || x.strip() == "" then true else x.is_float? end}
  
  unless num.all?
    status = false
    lines = num.each_index.select{|i| !num[i]}.map{|x| x+2}
    vals = val.each_index.select{|i| !num[i]}.map{|x| val[x]}
    STDERR.puts "All entries in Value must be missing or numeric: #{csv}"
    STDERR.puts "Problem on lines: #{lines} with bad values #{vals}}"
  end
  
end

if status
  puts "csv check passed"
  exit
end

exit 1


