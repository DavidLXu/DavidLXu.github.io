# frozen_string_literal: true

# Standard-library-only indexer. The committed index also works on GitHub Pages
# installations that disable custom Jekyll plugins.
require 'json'
require 'yaml'
require 'date'
require 'digest'
require 'cgi'
require 'fileutils'
require 'open3'

module RoboScope
  VERSION = 2
  STOPWORDS = %w[the and for with from that this paper notes are can not into using uses used via its their which than then also more but one two model models data learning robot robots policy policies method methods task tasks train training results based post supports english switching site language toggle navigation approach work new our we they these how has have was were will both each other such only without through].freeze

  def self.clean(text)
    text.to_s.gsub(/<(script|style)\b[^>]*>.*?<\/\1>/mi, ' ')
        .gsub(/```.*?```/m, ' ').gsub(/\$\$.*?\$\$/m, ' ')
        .gsub(/\$[^$\n]+\$/, ' ').gsub(/\\\[.*?\\\]/m, ' ')
        .gsub(/\\\(.*?\\\)/m, ' ').gsub(/!?\[([^\]]*)\]\([^)]*\)/, '\1')
        .gsub(/<[^>]*>/, ' ').then { |s| CGI.unescapeHTML(s) }
        .gsub(%r{https?://\S+}, ' ').gsub(/\\[a-zA-Z]+/, ' ')
        .gsub(/[*#`|{}]/, ' ').gsub(/\s+/, ' ').strip
  end

  def self.english_body(body)
    body.split(/<div\b[^>]*data-lang=["']zh["']/i).first.to_s
  end

  def self.summary(body, excerpt)
    explicit = clean(excerpt)
    return explicit unless explicit.empty?
    paragraphs = english_body(body).gsub(/<(script|style)\b[^>]*>.*?<\/\1>/mi, '')
                     .gsub(/```.*?```/m, '').split(/\n\s*\n/)
    paragraph = paragraphs.find do |part|
      value = clean(part)
      value.length >= 100 && !part.lstrip.start_with?('#', '|', '$$', '- ', '* ') &&
        !value.match?(/this post supports|language toggle|these notes follow|source version|^authors?\b|^paper:/i)
    end
    value = clean(paragraph)
    value.length > 600 ? value[0, 597].sub(/\s+\S*\z/, '') + '…' : value
  end

  def self.matches?(text, phrase)
    # Word boundaries prevent RL matching URLs and hand matching handwriting.
    pattern = Regexp.escape(phrase.downcase).gsub('\\ ', '[\\s-]+')
    pattern = "(?<![a-z0-9])#{pattern}(?![a-z0-9])" if phrase.ascii_only?
    text.downcase.tr('–—‑', '---').match?(Regexp.new(pattern))
  end

  def self.positive_summary_match?(text, phrase)
    # Do not treat an explicitly avoided data source as one the method uses.
    text.split(/(?<=[.!?;])\s+/).any? do |sentence|
      next false unless matches?(sentence, phrase)
      prefix = sentence.downcase.split(phrase.downcase, 2).first.to_s
      prefix = prefix[-90..] || prefix
      !prefix.match?(/\b(without|rather than|instead of|before any|does not|do not|no need for)\b/)
    end
  end

  def self.classify(post, taxonomy, override = {})
    facets = {}
    evidence = {}
    taxonomy.each do |dimension|
      facets[dimension['id']] = []
      dimension['values'].each do |value|
        source = nil
        phrase = nil
        { 'tags' => post['tags'].join(' / '), 'title' => post['title'], 'summary' => post['summary'] }.each do |field, text|
          phrase = value['aliases'].find do |alias_|
            matches?(text, alias_) && (field != 'summary' || positive_summary_match?(text, alias_))
          end
          if phrase
            source = field
            break
          end
        end
        next unless source
        facets[dimension['id']] << value['id']
        evidence[value['id']] = { 'source' => source, 'phrase' => phrase }
      end
    end
    # General manipulation is a fallback, not a duplicate of every specific task.
    if facets.fetch('task', []).length > 1
      facets['task'].delete('manipulation')
      evidence.delete('manipulation')
    end
    # Overrides replace a complete dimension, including [] to remove false positives.
    (override['facets'] || {}).each do |dimension, ids|
      definition = taxonomy.find { |item| item['id'] == dimension }
      raise "Unknown dimension: #{dimension}" unless definition
      allowed = definition['values'].map { |value| value['id'] }
      raise "Unknown labels in #{post['url']}: #{ids}" unless ids.is_a?(Array) && (ids - allowed).empty?
      facets[dimension].each { |id| evidence.delete(id) }
      facets[dimension] = ids.uniq
      ids.each { |id| evidence[id] = { 'source' => 'reviewed', 'phrase' => override['reason'].to_s } }
    end
    [facets, evidence]
  end

  def self.git_read(root, *args)
    output, error, status = Open3.capture3('git', '-C', root, *args)
    raise "Cannot read staged RoboScope inputs: #{error.strip}" unless status.success?
    output.force_encoding(Encoding::UTF_8)
  end

  def self.read_posts(root, staged: false)
    files = if staged
              git_read(root, 'ls-files', '-z', '--', '_posts').split("\0")
                .select { |path| path.match?(/\.(md|markdown|html)\z/) }
                .map { |path| File.join(root, path) }
            else
              Dir[File.join(root, '_posts', '*.{md,markdown,html}')]
            end
    files.sort.filter_map do |file|
      relative = file.delete_prefix(root + '/')
      source = staged ? git_read(root, 'show', ":#{relative}") : File.read(file)
      match = source.match(/\A---\s*\n(.*?)\n---\s*\n(.*)\z/m)
      next unless match
      meta = YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
      next if meta['published'] == false
      tags = Array(meta['tags'])
      next unless meta['title'].to_s.downcase.include?('paper notes') || tags.include?('Paper Notes')
      date = meta['date'].to_s[0, 10]
      next if date > Date.today.iso8601
      raise "Paper note requires permalink: #{file}" unless meta['permalink']
      {
        'id' => Digest::SHA256.hexdigest(meta['permalink'])[0, 12],
        'title' => meta['title'].sub('[Paper Notes]', '').strip,
        'url' => meta['permalink'], 'date' => date,
        'tags' => tags.reject { |tag| tag == 'Paper Notes' },
        'summary' => summary(match[2], meta['excerpt']),
        '_body' => clean(english_body(match[2]))[0, 3500]
      }
    end.sort_by { |post| [post['date'], post['id']] }.reverse
  end

  def self.vectors(posts, taxonomy)
    stop = STOPWORDS.to_h { |word| [word, true] }
    counts = posts.map do |post|
      text = ([post['title']] * 4 + [post['tags'].join(' ')] * 3 + [post['summary']] * 2 + [post['_body']]).join(' ').downcase
      taxonomy.each do |dimension|
        dimension['values'].each do |value|
          # Canonical features join aliases without losing the original prose.
          text += " #{value['id']} " * 5 if post['facets'][dimension['id']].include?(value['id'])
        end
      end
      tokens = text.scan(/[a-z][a-z0-9_-]{2,}/).map do |token|
        token = { 'hands' => 'hand', 'videos' => 'video', 'models' => 'model', 'datasets' => 'dataset', 'grasping' => 'grasp' }.fetch(token, token)
        token unless stop[token]
      end.compact
      tokens.tally
    end
    df = Hash.new(0)
    counts.each { |count| count.each_key { |token| df[token] += 1 } }
    counts.map do |count|
      vector = count.filter_map do |token, frequency|
        next if df[token] < 2
        [token, (1 + Math.log(frequency)) * (Math.log((posts.length + 1.0) / (df[token] + 1)) + 1)]
      end.to_h
      norm = Math.sqrt(vector.values.sum { |value| value * value })
      vector.transform_values { |value| norm.zero? ? 0 : value / norm }
    end
  end

  def self.similarities(posts, vectors)
    matrix = Array.new(posts.length) { Array.new(posts.length, 0.0) }
    posts.each_index do |i|
      (0...i).each do |j|
        a, b = [vectors[i], vectors[j]].sort_by(&:length)
        cosine = a.sum { |key, value| value * b.fetch(key, 0) }
        left = posts[i]['facets'].values.flatten
        right = posts[j]['facets'].values.flatten
        union = (left | right).length
        overlap = union.zero? ? 0 : (left & right).length.to_f / union
        matrix[i][j] = matrix[j][i] = 0.8 * cosine + 0.2 * overlap
      end
    end
    matrix
  end

  def self.seed(id)
    bytes = Digest::SHA256.digest(id).unpack('L<3')
    bytes.map { |value| (value.to_f / 0xffffffff - 0.5) * 8 }
  end

  def self.layout(posts, matrix, previous)
    saved = previous.fetch('papers', []).to_h { |post| [post['id'], post['position']] }
    positions = posts.map { |post| saved[post['id']] || seed(post['id']) }
    if saved.any?
      # Existing coordinates are immutable. Place additions close to known neighbors.
      posts.each_with_index do |post, i|
        next if saved.key?(post['id'])
        neighbors = posts.each_index.select { |j| saved.key?(posts[j]['id']) && matrix[i][j] >= 0.14 }
                         .sort_by { |j| [-matrix[i][j], posts[j]['id']] }.first(5)
        next if neighbors.empty?
        weight = neighbors.sum { |j| matrix[i][j] }
        jitter = seed(post['id'])
        positions[i] = 3.times.map { |axis| neighbors.sum { |j| positions[j][axis] * matrix[i][j] } / weight + jitter[axis] * 0.12 }
      end
    else
      # Initial deterministic neighbor graph layout, performed only once.
      edges = posts.each_index.flat_map do |i|
        posts.each_index.reject { |j| i == j || matrix[i][j] < 0.14 }
             .sort_by { |j| [-matrix[i][j], posts[j]['id']] }.first(5).map { |j| [i, j, matrix[i][j]] }
      end
      100.times do
        delta = Array.new(posts.length) { [0.0, 0.0, 0.0] }
        posts.each_index do |i|
          (0...i).each do |j|
            d = positions[i].zip(positions[j]).map { |a, b| a - b }
            distance = [d.sum { |v| v * v }, 0.08].max
            3.times do |axis|
              force = d[axis] * 0.06 / (distance * Math.sqrt(distance))
              delta[i][axis] += force
              delta[j][axis] -= force
            end
          end
        end
        edges.each do |i, j, weight|
          3.times do |axis|
            force = (positions[j][axis] - positions[i][axis]) * weight * 0.04
            delta[i][axis] += force
            delta[j][axis] -= force
          end
        end
        positions.each_with_index { |point, i| 3.times { |axis| point[axis] += delta[i][axis].clamp(-0.25, 0.25) - point[axis] * 0.002 } }
      end
      # Establish the viewport once; subsequent builds never renormalize it.
      unless positions.empty?
        [6.8, 3.6, 4.0].each_with_index do |extent, axis|
          low, high = positions.map { |point| point[axis] }.minmax
          middle = (low + high) / 2
          scale = high == low ? 1 : 2 * extent / (high - low)
          positions.each { |point| point[axis] = (point[axis] - middle) * scale }
        end
      end
    end
    positions.map { |point| point.map { |value| value.round(5) } }
  end

  def self.build(root, write: true, staged: false)
    read_input = ->(path) { staged ? git_read(root, 'show', ":#{path}") : File.read(File.join(root, path)) }
    taxonomy = JSON.parse(read_input.call('_data/roboscope_taxonomy.json'))
    overrides = YAML.safe_load(read_input.call('_data/roboscope_overrides.yml')) || {}
    posts = read_posts(root, staged: staged)
    ids = posts.map { |post| post['id'] }
    raise 'Duplicate paper permalink' unless ids.uniq.length == ids.length
    posts.each do |post|
      override = overrides.fetch(post['url'], {})
      post['summary'] = clean(override['summary']) if override['summary']
      post['facets'], post['evidence'] = classify(post, taxonomy, override)
    end
    matrix = similarities(posts, vectors(posts, taxonomy))
    path = File.join(root, 'assets/data/roboscope-index.json')
    previous = File.exist?(path) ? JSON.parse(File.read(path)) : {}
    positions = layout(posts, matrix, previous)
    posts.each_with_index do |post, i|
      post['position'] = positions[i]
      post['related'] = posts.each_index.reject { |j| i == j || matrix[i][j] < 0.14 }
        .sort_by { |j| [-matrix[i][j], posts[j]['id']] }.first(6).map do |j|
          { 'id' => posts[j]['id'], 'score' => matrix[i][j].round(4),
            'shared' => post['facets'].values.flatten & posts[j]['facets'].values.flatten }
        end
      post.delete('_body')
    end
    result = { 'version' => VERSION, 'latestNote' => posts.map { |post| post['date'] }.max,
               'similarity' => 'cleaned-tfidf-0.8+facet-jaccard-0.2', 'taxonomy' => taxonomy, 'papers' => posts }
    serialized = JSON.pretty_generate(result) + "\n"
    File.write(path, serialized) if write && (!File.exist?(path) || File.read(path) != serialized)
    [result, serialized]
  end
end

if $PROGRAM_NAME == __FILE__
  root = File.expand_path('..', __dir__)
  result, serialized = RoboScope.build(root, write: !ARGV.include?('--check'), staged: ARGV.include?('--staged'))
  if ARGV.include?('--check') && File.read(File.join(root, 'assets/data/roboscope-index.json')) != serialized
    abort 'RoboScope index is stale. Rebuild with the same --staged setting and commit the index.'
  end
  puts "RoboScope: #{result['papers'].length} papers, #{result['taxonomy'].length} dimensions; stable positions preserved."
end
