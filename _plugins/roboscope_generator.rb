# frozen_string_literal: true
require_relative '../scripts/build_roboscope'

module Jekyll
  class RoboScopeGenerator < Generator
    safe false
    priority :low

    def generate(site)
      RoboScope.build(site.source)
      Jekyll.logger.info 'RoboScope:', 'updated reading index; existing positions retained'
    end
  end
end
