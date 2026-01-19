{
  title: 'Home Assistant (Nabu Casa)',

  connection: {
    fields: [
      {
        name: 'base_url',
        label: 'Nabu Casa URL',
        hint: 'Your Nabu Casa URL (e.g., https://xxxxx.ui.nabu.casa)',
        optional: false
      },
      {
        name: 'access_token',
        label: 'Long-Lived Access Token',
        hint: 'Generate from Home Assistant Profile page',
        optional: false,
        control_type: 'password'
      }
    ],

    authorization: {
      type: 'custom_auth',

      apply: lambda do |connection|
        headers('Authorization': "Bearer #{connection['access_token']}")
      end
    },

    base_uri: lambda do |connection|
      # Ensure URL doesn't have trailing slash
      connection['base_url'].to_s.chomp('/')
    end
  },

  test: lambda do |connection|
    # Test connection by getting API status
    get('/api/')
      .after_error_response(401) do |code, body, headers, message|
        error("Authentication failed: Invalid access token")
      end
      .after_error_response(/.*/) do |code, body, headers, message|
        error("Connection failed (#{code}): #{message}")
      end
  end,

  actions: {
    get_states: {
      title: 'Get All States',
      subtitle: 'Get states of all entities',
      description: 'Returns an array of state objects representing all entities in Home Assistant',

      execute: lambda do |connection, input|
        response = get('/api/states')
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to get states (#{code}): #{message}")
          end
        
        { entities: response }
      end,

      output_fields: lambda do |object_definitions|
        [
          {
            name: 'entities',
            label: 'Entities',
            type: 'array',
            of: 'object',
            properties: [
              { name: 'entity_id', label: 'Entity ID', type: 'string' },
              { name: 'state', label: 'State', type: 'string' },
              { name: 'last_changed', label: 'Last Changed', type: 'string' },
              { name: 'last_updated', label: 'Last Updated', type: 'string' },
              { name: 'attributes', label: 'Attributes', type: 'object', properties: [] }
            ]
          }
        ]
      end
    },

    get_entity_state: {
      title: 'Get Entity State',
      subtitle: 'Get state of a specific entity',
      description: 'Returns the state object for a specific entity',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'entity_id',
            label: 'Entity ID',
            hint: 'Entity ID (e.g., light.living_room, switch.bedroom)',
            optional: false
          }
        ]
      end,

      execute: lambda do |connection, input|
        get("/api/states/#{input['entity_id']}")
          .after_error_response(404) do |code, body, headers, message|
            error("Entity '#{input['entity_id']}' not found")
          end
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to get entity state (#{code}): #{message}")
          end
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'entity_id', label: 'Entity ID', type: 'string' },
          { name: 'state', label: 'State', type: 'string' },
          { name: 'last_changed', label: 'Last Changed', type: 'string' },
          { name: 'last_updated', label: 'Last Updated', type: 'string' },
          { name: 'attributes', label: 'Attributes', type: 'object', properties: [] }
        ]
      end
    },

    call_service: {
      title: 'Call Service',
      subtitle: 'Execute a Home Assistant service',
      description: 'Calls a service within a specific domain (e.g., turn on light, set climate)',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'domain',
            label: 'Domain',
            hint: 'Service domain (e.g., light, switch, climate, notify)',
            optional: false
          },
          {
            name: 'service',
            label: 'Service',
            hint: 'Service name (e.g., turn_on, turn_off, set_temperature)',
            optional: false
          },
          {
            name: 'service_data',
            label: 'Service Data',
            hint: 'Service parameters as JSON (e.g., {"entity_id": "light.living_room"})',
            optional: true,
            type: 'object',
            properties: []
          }
        ]
      end,

      execute: lambda do |connection, input|
        payload = input['service_data'] || {}
        
        response = post("/api/services/#{input['domain']}/#{input['service']}", payload)
          .after_error_response(400) do |code, body, headers, message|
            error("Invalid service call (#{code}): #{message}")
          end
          .after_error_response(404) do |code, body, headers, message|
            error("Service '#{input['domain']}.#{input['service']}' not found")
          end
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Service call failed (#{code}): #{message}")
          end
        
        {
          success: true,
          changed_states: response
        }
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'success', label: 'Success', type: 'boolean' },
          {
            name: 'changed_states',
            label: 'Changed States',
            type: 'array',
            of: 'object',
            properties: []
          }
        ]
      end
    },

    turn_on: {
      title: 'Turn On',
      subtitle: 'Turn on an entity',
      description: 'Turns on a light, switch, or other controllable entity',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'entity_id',
            label: 'Entity ID',
            hint: 'Entity to turn on (e.g., light.living_room, switch.bedroom)',
            optional: false
          },
          {
            name: 'brightness',
            label: 'Brightness',
            hint: 'Brightness level (0-255, for lights only)',
            optional: true,
            type: 'integer'
          },
          {
            name: 'rgb_color',
            label: 'RGB Color',
            hint: 'RGB color as array [R, G, B] (for lights only)',
            optional: true,
            type: 'array',
            of: 'integer'
          }
        ]
      end,

      execute: lambda do |connection, input|
        # Determine domain from entity_id
        domain = input['entity_id'].split('.').first
        
        # Build service data
        service_data = { entity_id: input['entity_id'] }
        service_data[:brightness] = input['brightness'] if input['brightness'].present?
        service_data[:rgb_color] = input['rgb_color'] if input['rgb_color'].present?
        
        response = post("/api/services/#{domain}/turn_on", service_data)
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to turn on entity (#{code}): #{message}")
          end
        
        {
          success: true,
          entity_id: input['entity_id'],
          changed_states: response
        }
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'success', label: 'Success', type: 'boolean' },
          { name: 'entity_id', label: 'Entity ID', type: 'string' },
          {
            name: 'changed_states',
            label: 'Changed States',
            type: 'array',
            of: 'object',
            properties: []
          }
        ]
      end
    },

    turn_off: {
      title: 'Turn Off',
      subtitle: 'Turn off an entity',
      description: 'Turns off a light, switch, or other controllable entity',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'entity_id',
            label: 'Entity ID',
            hint: 'Entity to turn off (e.g., light.living_room, switch.bedroom)',
            optional: false
          }
        ]
      end,

      execute: lambda do |connection, input|
        # Determine domain from entity_id
        domain = input['entity_id'].split('.').first
        
        response = post("/api/services/#{domain}/turn_off", { entity_id: input['entity_id'] })
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to turn off entity (#{code}): #{message}")
          end
        
        {
          success: true,
          entity_id: input['entity_id'],
          changed_states: response
        }
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'success', label: 'Success', type: 'boolean' },
          { name: 'entity_id', label: 'Entity ID', type: 'string' },
          {
            name: 'changed_states',
            label: 'Changed States',
            type: 'array',
            of: 'object',
            properties: []
          }
        ]
      end
    },

    get_config: {
      title: 'Get Configuration',
      subtitle: 'Get Home Assistant configuration',
      description: 'Returns the current Home Assistant configuration',

      execute: lambda do |connection, input|
        get('/api/config')
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to get configuration (#{code}): #{message}")
          end
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'latitude', label: 'Latitude', type: 'number' },
          { name: 'longitude', label: 'Longitude', type: 'number' },
          { name: 'elevation', label: 'Elevation', type: 'integer' },
          { name: 'unit_system', label: 'Unit System', type: 'object', properties: [] },
          { name: 'location_name', label: 'Location Name', type: 'string' },
          { name: 'time_zone', label: 'Time Zone', type: 'string' },
          { name: 'components', label: 'Components', type: 'array', of: 'string' },
          { name: 'config_dir', label: 'Config Directory', type: 'string' },
          { name: 'version', label: 'Version', type: 'string' }
        ]
      end
    },

    get_services: {
      title: 'Get Services',
      subtitle: 'List all available services',
      description: 'Returns a list of all available services grouped by domain',

      execute: lambda do |connection, input|
        response = get('/api/services')
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to get services (#{code}): #{message}")
          end
        
        { services: response }
      end,

      output_fields: lambda do |object_definitions|
        [
          {
            name: 'services',
            label: 'Services',
            type: 'array',
            of: 'object',
            properties: []
          }
        ]
      end
    },

    get_history: {
      title: 'Get History',
      subtitle: 'Get entity state history',
      description: 'Returns state changes for entities over a time period',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'timestamp',
            label: 'Start Timestamp',
            hint: 'ISO 8601 timestamp (e.g., 2024-01-12T00:00:00Z). Defaults to 1 day ago.',
            optional: true,
            type: 'string'
          },
          {
            name: 'filter_entity_id',
            label: 'Filter Entity ID',
            hint: 'Comma-separated list of entity IDs to filter',
            optional: true
          },
          {
            name: 'end_time',
            label: 'End Timestamp',
            hint: 'ISO 8601 timestamp for end of period',
            optional: true,
            type: 'string'
          }
        ]
      end,

      execute: lambda do |connection, input|
        # Build URL with optional timestamp
        url = '/api/history/period'
        url += "/#{input['timestamp']}" if input['timestamp'].present?
        
        # Build query parameters
        params = {}
        params[:filter_entity_id] = input['filter_entity_id'] if input['filter_entity_id'].present?
        params[:end_time] = input['end_time'] if input['end_time'].present?
        
        response = get(url, params)
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to get history (#{code}): #{message}")
          end
        
        { history: response }
      end,

      output_fields: lambda do |object_definitions|
        [
          {
            name: 'history',
            label: 'History',
            type: 'array',
            of: 'array',
            properties: []
          }
        ]
      end
    },

    send_notification: {
      title: 'Send Notification',
      subtitle: 'Send a notification',
      description: 'Sends a notification through Home Assistant notification service',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'service',
            label: 'Notification Service',
            hint: 'Notification service name (e.g., mobile_app_iphone, persistent_notification)',
            optional: false
          },
          {
            name: 'title',
            label: 'Title',
            hint: 'Notification title',
            optional: true
          },
          {
            name: 'message',
            label: 'Message',
            hint: 'Notification message',
            optional: false
          },
          {
            name: 'data',
            label: 'Additional Data',
            hint: 'Additional notification data (JSON object)',
            optional: true,
            type: 'object',
            properties: []
          }
        ]
      end,

      execute: lambda do |connection, input|
        service_data = { message: input['message'] }
        service_data[:title] = input['title'] if input['title'].present?
        service_data[:data] = input['data'] if input['data'].present?
        
        response = post("/api/services/notify/#{input['service']}", service_data)
          .after_error_response(/.*/) do |code, body, headers, message|
            error("Failed to send notification (#{code}): #{message}")
          end
        
        {
          success: true,
          service: input['service']
        }
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'success', label: 'Success', type: 'boolean' },
          { name: 'service', label: 'Service Used', type: 'string' }
        ]
      end
    }
  },

  triggers: {
    new_state_change: {
      title: 'New State Change',
      subtitle: 'Triggers when an entity state changes',
      description: 'Monitors entity state changes and triggers when a change is detected',

      input_fields: lambda do |object_definitions|
        [
          {
            name: 'entity_id',
            label: 'Entity ID',
            hint: 'Entity to monitor (leave blank to monitor all entities)',
            optional: true
          },
          {
            name: 'since',
            label: 'Since',
            hint: 'Timestamp to start monitoring from',
            optional: true,
            type: 'timestamp'
          }
        ]
      end,

      poll: lambda do |connection, input, last_updated_since|
        # Use last_updated_since or input since or default to 5 minutes ago
        since = last_updated_since || input['since'] || 5.minutes.ago.utc.iso8601
        
        # Get all states
        states = get('/api/states')
        
        # Filter by entity_id if specified
        if input['entity_id'].present?
          states = states.select { |s| s['entity_id'] == input['entity_id'] }
        end
        
        # Filter by last_updated timestamp
        states = states.select do |state|
          state['last_updated'] > since
        end
        
        # Sort by last_updated
        states = states.sort_by { |s| s['last_updated'] }
        
        {
          events: states,
          next_poll: states.last&.dig('last_updated') || since
        }
      end,

      dedup: lambda do |state|
        "#{state['entity_id']}_#{state['last_updated']}"
      end,

      output_fields: lambda do |object_definitions|
        [
          { name: 'entity_id', label: 'Entity ID', type: 'string' },
          { name: 'state', label: 'State', type: 'string' },
          { name: 'last_changed', label: 'Last Changed', type: 'string' },
          { name: 'last_updated', label: 'Last Updated', type: 'string' },
          { name: 'attributes', label: 'Attributes', type: 'object', properties: [] }
        ]
      end
    }
  },

  methods: {
    # Helper methods can be added here if needed
  },

  object_definitions: {
    # Object definitions for reusable schemas
  }
}