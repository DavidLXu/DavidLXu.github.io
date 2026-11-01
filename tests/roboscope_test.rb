# frozen_string_literal: true
require 'minitest/autorun'
require 'tmpdir'
require_relative '../scripts/build_roboscope'

class RoboScopeTest < Minitest::Test
  ROOT = File.expand_path('..', __dir__)
  TAXONOMY = JSON.parse(File.read(File.join(ROOT, '_data/roboscope_taxonomy.json')))

  def sample(title: 'An unrelated paper', tags: [], summary: '')
    { 'title' => title, 'tags' => tags, 'summary' => summary, 'url' => '/sample/' }
  end

  def test_formula_code_and_html_noise_are_removed
    raw = "<style>.a {color:red}</style>Touch &amp; vision $\\mathrm{x}$\n```python\nworld model\n``` [paper](https://example.com)"
    assert_equal 'Touch & vision paper', RoboScope.clean(raw)
  end

  def test_multidimensional_assignment_is_not_exclusive
    facets, evidence = RoboScope.classify(sample(title: 'In-hand manipulation with tactile reinforcement learning'), TAXONOMY)
    assert_equal ['in_hand'], facets['task']
    assert_includes facets['method'], 'rl'
    assert_includes facets['embodiment'], 'dexterous_hand'
    assert_includes facets['data'], 'tactile'
    assert_equal 'title', evidence['rl']['source']
  end

  def test_contact_is_not_automatically_touch
    facets, = RoboScope.classify(sample(title: 'Contact-aware trajectory optimization'), TAXONOMY)
    refute_includes facets['data'], 'tactile'
    assert_includes facets['method'], 'planning'
  end

  def test_acronyms_use_word_boundaries
    facets, = RoboScope.classify(sample(title: 'Worlds and handwriting'), TAXONOMY)
    refute_includes facets['method'], 'rl'
    assert_empty facets['embodiment']
  end

  def test_an_avoided_data_source_is_not_a_positive_summary_label
    facets, = RoboScope.classify(sample(summary: 'Built from human videos rather than expensive robot teleoperation data.'), TAXONOMY)
    assert_includes facets['data'], 'human_video'
    refute_includes facets['data'], 'teleop'
    facets, = RoboScope.classify(sample(summary: 'The robot uses egocentric RGB-D observations for navigation.'), TAXONOMY)
    refute_includes facets['data'], 'human_video'
  end

  def test_reviewed_overrides_can_clear_or_replace_a_dimension
    post = sample(title: 'Tactile reinforcement learning')
    facets, evidence = RoboScope.classify(post, TAXONOMY, { 'facets' => {'method' => [], 'data' => ['vision']}, 'reason' => 'Checked sensor setup' })
    assert_empty facets['method']
    assert_equal ['vision'], facets['data']
    assert_equal 'reviewed', evidence['vision']['source']
    refute evidence.key?('tactile')
    assert_raises(RuntimeError) { RoboScope.classify(post, TAXONOMY, { 'facets' => {'method' => ['typo']} }) }
  end

  def test_summary_skips_bilingual_boilerplate
    expected = 'This method uses human touch to train a predictive model, then transfers that model to a robot with a compatible sensor layout.'
    body = "<div data-lang=\"en\">\n\nThis post supports English / 中文 switching via the site language toggle.\n\n## TL;DR\n\n#{expected}\n\n<div data-lang=\"zh\">中文"
    assert_equal expected, RoboScope.summary(body, nil)
  end

  def test_adding_a_paper_preserves_all_existing_positions
    original = [{'id' => 'a'}, {'id' => 'b'}]
    saved = {'papers' => [{'id' => 'a', 'position' => [1,2,3]}, {'id' => 'b', 'position' => [-1,0,2]}]}
    positions = RoboScope.layout(original + [{'id' => 'c'}], [[0,0.2,0.5],[0.2,0,0.6],[0.5,0.6,0]], saved)
    assert_equal [1,2,3], positions[0]
    assert_equal [-1,0,2], positions[1]
    assert positions[2].all?(&:finite?)
  end

  def test_initial_map_fits_viewport
    positions = RoboScope.layout((0...5).map { |i| {'id' => i.to_s} }, Array.new(5) { Array.new(5,0.3) }, {})
    positions.each { |point| assert point.zip([6.8,3.6,4]).all? { |value,bound| value.abs <= bound } }
  end

  def test_index_is_reproducible_and_relations_are_valid
    result, serialized = RoboScope.build(ROOT, write: false)
    assert_equal serialized, RoboScope.build(ROOT, write: false).last
    ids = result['papers'].map { |p| p['id'] }
    result['papers'].each do |post|
      assert post['position'].all?(&:finite?)
      post['related'].each do |related|
        assert_includes ids, related['id']
        refute_equal post['id'], related['id']
        assert related['score'].between?(0,1)
      end
    end
  end

  def test_staged_posts_exclude_drafts_and_use_the_version_to_be_committed
    Dir.mktmpdir('roboscope-stage-test') do |repo|
      _output, error, status = Open3.capture3('git', 'init', '-q', repo)
      assert status.success?, error
      FileUtils.mkdir_p(File.join(repo, '_posts'))
      note = "---\ntitle: '[Paper Notes] Staged paper'\ndate: 2024-01-01\npermalink: /staged/\ntags: [Paper Notes]\n---\n\nThis is the version intended for publication, with enough context to produce a short and useful reading summary.\n"
      path = File.join(repo, '_posts/2024-01-01-paper.md')
      File.write(path, note)
      RoboScope.git_read(repo, 'add', '--', '_posts/2024-01-01-paper.md')
      File.write(path, note.sub('Staged paper', 'Unstaged edits'))
      File.write(File.join(repo, '_posts/2024-01-02-draft.md'), note.sub('/staged/', '/draft/'))
      posts = RoboScope.read_posts(repo, staged: true)
      assert_equal 1, posts.length
      assert_equal 'Staged paper', posts.first['title']
      assert_equal '/staged/', posts.first['url']
    end
  end
end
