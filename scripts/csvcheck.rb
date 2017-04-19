require 'csv'

# Add an is_float method to the string
class String
  def is_float?
    true if Float(self) rescue false
  end
end

csvs = Dir.glob("data/indicator*.csv")

csvs.each do |csv|
  puts " "
  puts csv
  dat = CSV.read(csv, :headers => true)
  # you can get the headers so now you can error if they're wrong
  puts "#{dat.headers[0]}, #{dat.headers[-1]}"
  
  puts "Is last col Value: #{dat.headers[-1] == 'Value'}"
  puts "Is first col Year: #{dat.headers[0] == 'Year'}"


  val = dat.map{|x| x[-1]}  
  # Check that they're not all missing
  
  allmissing = val.map{|x| x.nil?}.all?
  puts "All missing: #{allmissing}"
  
  
  # Check that value is numeric
  unless allmissing
      num = val.map{|x| if x.nil? then true else x.is_float? end}
      puts "All value numeric?: #{num.all?}"
  end
  
end


