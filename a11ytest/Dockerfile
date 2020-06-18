FROM debian:buster-slim
RUN apt update
RUN apt install -y ruby-full build-essential zlib1g-dev
RUN export GEM_HOME="$HOME/gems"
RUN export PATH="$HOME/gems/bin:$PATH"
RUN gem install jekyll bundler
RUN mkdir /site
WORKDIR /site
CMD bundle install && bundle exec jekyll build