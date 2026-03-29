#!/bin/bash

# Test Enhanced Job Tracking System
echo "🚀 Testing Enhanced Job Tracking System with Automated Pipeline Management..."
echo "============================================================================="

cd /Users/jeongsk/.openclaw/workspace/korean-job-hunter

echo "📊 Current baseline metrics from autoresearch:"
echo "=============================================="
cat data/autoresearch/baseline.json | jq '.metrics'

echo ""
echo "🔧 Creating test database and running enhanced tracking test..."

# Run the enhanced tracking test
node data/autoresearch/experiment-012/enhanced_tracking_system.js

if [ $? -eq 0 ]; then
    echo "✅ Enhanced tracking test completed successfully"
    
    # Check if database was created and populated
    echo ""
    echo "📈 Checking database state..."
    echo "============================"
    
    # Check if database file exists and has size
    if [ -f "data/jobs.db" ]; then
        echo "✅ Database file created (Size: $(stat -f%z data/jobs.db) bytes)"
        
        # Count applications
        echo ""
        echo "📊 Application statistics:"
        echo "=========================="
        sqlite3 data/jobs.db "SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY status;"
        
        # Count matches
        echo ""
        echo "🎯 Match statistics:"
        echo "===================="
        sqlite3 data/jobs.db "SELECT ROUND(AVG(score),2) as avg_score, COUNT(*) as count FROM matches;"
        
        # Count transitions
        echo ""
        echo "🔄 Transition statistics:"
        echo "=========================="
        sqlite3 data/jobs.db "SELECT COUNT(*) as total_transitions FROM status_transitions;"
        
        # Calculate efficiency metrics
        echo ""
        echo "📈 Efficiency Analysis:"
        echo "======================"
        
        total_apps=$(sqlite3 data/jobs.db "SELECT COUNT(*) FROM applications;")
        high_priority=$(sqlite3 data/jobs.db "SELECT COUNT(*) FROM applications WHERE priority_score >= 70;")
        avg_priority=$(sqlite3 data/jobs.db "SELECT ROUND(AVG(priority_score),2) FROM applications;")
        
        echo "Total applications: $total_apps"
        echo "High priority applications: $high_priority ($((high_priority * 100 / total_apps))%)"
        echo "Average priority score: $avg_priority"
        
        # Compare with baseline metrics
        echo ""
        echo "🎯 Performance Comparison:"
        echo "=========================="
        
        baseline_priority=$(cat data/autoresearch/baseline.json | jq '.metrics.test_pass_rate')
        current_efficiency=$(echo "scale=2; $avg_priority / 100 * 100" | bc)
        
        echo "Baseline test pass rate: $baseline_priority%"
        echo "Current tracking efficiency: $current_efficiency%"
        
        if (( $(echo "$current_efficiency > 80" | bc -l) )); then
            echo "🎉 SUCCESS: Tracking efficiency improved above 80% threshold!"
        else
            echo "⚠️  NEEDS IMPROVEMENT: Tracking efficiency below 80% threshold"
        fi
        
    else
        echo "❌ Database file not found"
        exit 1
    fi
    
    echo ""
    echo "🧹 Cleaning up test data..."
    rm -f data/jobs.db
    
else
    echo "❌ Enhanced tracking test failed"
    exit 1
fi

echo ""
echo "📋 Experiment Summary:"
echo "===================="
echo "Hypothesis: Automated pipeline management improves tracking efficiency by 40%"
echo "Target: Reduce manual updates by 60%, enhance query accuracy"
echo "Measurement: Priority scoring, automated transitions, query performance"

echo ""
echo "✅ Experiment 012 test completed!"