'use strict';

/**
 * @ngdoc service
 * @name smallblackdogApp.redditMusicService
 * @description
 * # redditMusicService
 * Service in the smallblackdogApp.
 */
angular.module('smallblackdogApp')
  .service('redditMusicService', function redditMusicService($rootScope, $http, $q) {

    var VALID_MUSIC_DOMAINS = [
      'youtube.com'
    ];

    var MUSIC_SUBREDDITS = [
      'music',
      'listentothis',
      'futurebeats',
      'edm',
      'dubstep',
      'electrohouse',
      'realdubstep',
      'hiphopheads',
      'chillmusic',
      'treemusic',
      'indie',
      'electronicmusic',
      'glitch',
      'metal',
      'trance',
      'jazz',
      'postrock',
      'progmetal',
      'punk',
      'psychedelicrock',
      'shoegaze',
      'rock',
      'country',
      'classicrock',
      'alternativerock'
    ];

    var pusher = new Pusher('50ed18dd967b455393ed');

    var subredditNewPostListUrl = function(subreddit) {
      // more on reddit api http://www.reddit.com/dev/api
      return sprintf('http://www.reddit.com/r/%s/new.json?limit=100', subreddit);
    };

    var isValidTrackPost = function(post) {
      return _.contains(VALID_MUSIC_DOMAINS, post.domain);
    }

    var cleanTrackData = function(data) {
      data.title = data.title.replace(/ *\([^)]*\) */g, "").replace(/ *\[[^)]*\] */g, "");
      return data;
    }

    var extractTrackMetadata = function(post) {
      var re = /([\w\s]+)\s-+\s([\w\s]+)/;
    }

    var getTracklistFromSubredditNewPostList = function(subreddit) {
      var defer = $q.defer();
      console.log('fill playlist from subreddit ', subreddit);
      var url = subredditNewPostListUrl(subreddit);

      $http({method: 'GET', url: url}).
          success(function(data, status, headers, config) {
            if(!data.data) {
              return;
            }
            var posts = data.data.children;
            var newTracks = _.chain(posts)
              .map('data')
              .filter(isValidTrackPost)
              .map(cleanTrackData)
              .value();
            defer.resolve(newTracks);
          }).
          error(function(data, status, headers, config) {
            console.log('oops, reddit api calling failed');
          });

      return defer.promise;
    };


    this.watchChannelsPost = function() {
      console.log('init');

      var channels = _.map(MUSIC_SUBREDDITS, function(name){
        return pusher.subscribe(name);
      });

      var newPostCallback = function(post) {
        console.log('new post from reddit', post);
        if (isValidTrackPost(post)) {
          $rootScope.$broadcast('event:new-track', post);
        }
      };

      channels.forEach(function(channel) {
        channel.bind('new-listing', newPostCallback);
      });
    };

    this.initTracksFromOldRedditPost = function() {
      // random select 3 subreddit
      var subreddits = _.sample(MUSIC_SUBREDDITS, 3);

      var requests = _.map(subreddits, function(subreddit) {
        return getTracklistFromSubredditNewPostList(subreddit);
      });

      $q.all(requests).then(function(data){
        var newTracks = _.flatten(data, true);
        $rootScope.$broadcast('event:init-track-list', newTracks);
      });

    };

    this.init = function() {
      this.initTracksFromOldRedditPost();
      this.watchChannelsPost();
    };

    this.getCoverByTrackTitle = function(title) {
      var defer = $q.defer();
      var url = sprintf(
        'https://api.spotify.com/v1/search?q=%s&type=track',
        escape(title)
      );

      $http({method: 'GET', url: url}).
          success(function(data, status, headers, config) {
            console.log(data);
            try {
              var url = data.tracks.items[0].album.images[0].url;
              defer.resolve(url);
            } catch(e) {
              console.log('no available cover');
            }
          }).
          error(function(data, status, headers, config) {
            console.log('oops, spotify search api calling failed');
          });
      return defer.promise;
    };

  });