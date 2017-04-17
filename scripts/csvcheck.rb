require 'csv'

csvs = Dir.glob("data/indicator*.csv")

csvs.each do |csv|
  dat = CSV.read(csv, :headers => true)
  # you can get the headers so now you can error if they're wrong
  puts "#{dat.headers[0]}, #{dat.headers[-1]}"
end

