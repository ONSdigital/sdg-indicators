require 'csv'

csvs = Dir.glob("data/indicator*.csv")

csvs.each do |csv|
  dat = CSV.read(csv, :headers => true)
  puts "#{dat.headers[0]}, #{dat.headers[-1]}"
end

